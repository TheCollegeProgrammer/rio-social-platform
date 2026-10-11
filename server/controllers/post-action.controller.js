const Post = require("../models/post");
const User = require("../models/User");
const { extractHashtags } = require("./post.controller");
const { createNotification } = require("./notification.controller");

const editPost = async (req, res) => {
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
        if (post.author.toString() !== req.user.id) {
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
        res.status(500).json({ errors: ["Server error"] });
    }
};

const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const Comment = require("../models/Comment");
        await Comment.deleteMany({ post: post._id });
        await User.updateMany(
            { bookmarks: post._id },
            { $pull: { bookmarks: post._id } }
        );
        if (post.image) {
            const fs = require("fs");
            const path = require("path");
            const imgPath = path.join(__dirname, "..", "uploads", path.basename(post.image));
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        await post.deleteOne();

        res.json({ message: "Post deleted" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const toggleLike = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });

        const userId = req.user.id;
        const alreadyLiked = post.likes.some((id) => id.toString() === userId);

        if (alreadyLiked) post.likes.pull(userId);
        else {
            post.likes.push(userId);
            createNotification({
                recipient: post.author,
                sender: userId,
                type: "like",
                post: post._id
            });
        }

        await post.save();
        res.json({ liked: !alreadyLiked, likesCount: post.likes.length });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { editPost, deletePost, toggleLike };
