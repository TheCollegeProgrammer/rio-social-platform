const Comment = require("../models/Comment");
const Post = require("../models/post");
const { createNotification } = require("./notification.controller");

const createComment = async (req, res) => {
    try {
        const { content, parentComment } = req.body;
        const postId = req.params.postId;

        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Comment content is required"] });
        }
        if (content.length > 1000) {
            return res.status(400).json({ errors: ["Comment must be under 1000 characters"] });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });

        let depth = 0;
        let parent = null;
        if (parentComment) {
            parent = await Comment.findById(parentComment);
            if (!parent) return res.status(404).json({ errors: ["Parent comment not found"] });
            if (parent.post.toString() !== postId) {
                return res.status(400).json({ errors: ["Parent comment belongs to different post"] });
            }
            depth = parent.depth + 1;
            if (depth > 3) {
                return res.status(400).json({ errors: ["Maximum reply depth reached"] });
            }
        }

        const comment = await Comment.create({
            content: content.trim(),
            author: req.user.id,
            post: postId,
            parentComment: parentComment || null,
            depth
        });

        await comment.populate("author", "username name avatar");
        const totalComments = await Comment.countDocuments({ post: postId });

        if (parent) {
            createNotification({
                recipient: parent.author,
                sender: req.user.id,
                type: "reply",
                post: postId,
                comment: comment._id
            });
        } else {
            createNotification({
                recipient: post.author,
                sender: req.user.id,
                type: "comment",
                post: postId,
                comment: comment._id
            });
        }

        res.status(201).json({ message: "Comment created", comment, totalComments });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

const getComments = async (req, res) => {
    try {
        const postId = req.params.postId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });

        const comments = await Comment.find({ post: postId, parentComment: null })
            .populate("author", "username name avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const commentIds = comments.map((c) => c._id);
        const replies = await Comment.find({ parentComment: { $in: commentIds } })
            .populate("author", "username name avatar")
            .sort({ createdAt: 1 });

        const total = await Comment.countDocuments({ post: postId });

        const commentsWithReplies = comments.map((comment) => ({
            ...comment.toObject(),
            replies: replies.filter(
                (r) => r.parentComment.toString() === comment._id.toString()
            )
        }));

        res.json({
            comments: commentsWithReplies,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { createComment, getComments };
