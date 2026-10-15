const Post = require("../models/post");
const User = require("../models/User");
const { extractHashtags } = require("./post.controller");
const { createNotification } = require("./notification.controller");

const canModerate = async (post, userId) => {
    if (post.author.toString() === userId) return true;
    const me = await User.findById(userId, { role: 1 });
    return me?.role === "admin";
};

const editPost = async (req, res, next) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Post content is required"] });
        }
        if (content.length > 5000) {
            return res.status(400).json({ errors: ["Post must be under 5000 characters"] });
        }

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        if (!(await canModerate(post, req.user.id))) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        post.content = content.trim();
        post.hashtags = extractHashtags(content);
        post.editedAt = new Date();
        await post.save();
        await post.populate("author", "username name avatar");

        res.json({ message: "Post updated", post });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

const deletePost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        if (!(await canModerate(post, req.user.id))) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const Comment = require("../models/Comment");
        await Comment.deleteMany({ post: post._id });
        await User.updateMany(
            { bookmarks: post._id },
            { $pull: { bookmarks: post._id } }
        );
        const imgs = post.images?.length ? post.images : post.image ? [post.image] : [];
        if (imgs.length) {
            const fs = require("fs");
            const path = require("path");
            imgs.forEach((p) => {
                const imgPath = path.join(__dirname, "..", "uploads", path.basename(p));
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            });
        }
        await post.deleteOne();

        res.json({ message: "Post deleted" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

const toggleLike = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });

        const userId = req.user.id;
        const alreadyLiked = post.likes.some((id) => id.toString() === userId);

        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            alreadyLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
            { new: true }
        );

        if (!alreadyLiked) {
            createNotification({
                recipient: post.author,
                sender: userId,
                type: "like",
                post: post._id
            });
        }

        res.json({ liked: !alreadyLiked, likesCount: updated.likes.length });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

module.exports = { editPost, deletePost, toggleLike };
