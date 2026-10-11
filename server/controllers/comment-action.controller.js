const Comment = require("../models/Comment");
const { createNotification } = require("./notification.controller");

const editComment = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Content is required"] });
        }
        if (content.length > 1000) {
            return res.status(400).json({ errors: ["Comment must be under 1000 characters"] });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ errors: ["Comment not found"] });
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        comment.content = content.trim();
        comment.editedAt = new Date();
        await comment.save();
        await comment.populate("author", "username name avatar");

        res.json({ message: "Comment updated", comment });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid comment ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ errors: ["Comment not found"] });
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const deleteChildren = async (parentId) => {
            const children = await Comment.find({ parentComment: parentId });
            for (const child of children) {
                await deleteChildren(child._id);
            }
            await Comment.findByIdAndDelete(parentId);
        };

        await deleteChildren(comment._id);
        res.json({ message: "Comment deleted" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid comment ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const toggleCommentLike = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ errors: ["Comment not found"] });

        const userId = req.user.id;
        const alreadyLiked = comment.likes.some((id) => id.toString() === userId);

        if (alreadyLiked) comment.likes.pull(userId);
        else {
            comment.likes.push(userId);
            createNotification({
                recipient: comment.author,
                sender: userId,
                type: "like",
                post: comment.post,
                comment: comment._id
            });
        }

        await comment.save();
        res.json({ liked: !alreadyLiked, likesCount: comment.likes.length });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid comment ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { editComment, deleteComment, toggleCommentLike };
