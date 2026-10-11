const Post = require("../models/post");
const path = require("path");
const fs = require("fs");
const { extractHashtags } = require("./post.controller");

const uploadDir = path.join(__dirname, "..", "uploads");

const createPostWithImage = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Post content is required"] });
        }
        if (content.length > 5000) {
            return res.status(400).json({ errors: ["Post must be under 5000 characters"] });
        }

        const post = await Post.create({
            content: content.trim(),
            author: req.user.id,
            hashtags: extractHashtags(content),
            image: req.file ? `/uploads/${req.file.filename}` : null
        });

        await post.populate("author", "username name avatar");
        res.status(201).json({ message: "Post created", post });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

const removePostImage = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }
        if (!post.image) {
            return res.status(400).json({ errors: ["No image on this post"] });
        }

        const filePath = path.join(uploadDir, path.basename(post.image));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        post.image = null;
        post.editedAt = new Date();
        await post.save();

        res.json({ message: "Image removed", post });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { createPostWithImage, removePostImage };
