const Post = require("../models/post");
const path = require("path");
const fs = require("fs");
const { extractHashtags } = require("./post.controller");
const { normalizeCategory } = require("../config/categories");

const uploadDir = path.join(__dirname, "..", "uploads");
const MAX_IMAGES = 8;

const toPaths = (files) => (files || []).map((f) => `/uploads/${f.filename}`);
const allImages = (post) =>
    post.images?.length ? post.images : post.image ? [post.image] : [];
const syncFirst = (post) => {
    post.image = post.images.length ? post.images[0] : null;
};
const deleteFiles = (list) => {
    list.forEach((p) => {
        const fp = path.join(uploadDir, path.basename(p));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });
};

const createPostWithImage = async (req, res, next) => {
    try {
        const { content } = req.body;
        const images = toPaths(req.files);

        if (!content || !content.trim()) {
            deleteFiles(images);
            return res.status(400).json({ errors: ["Post content is required"] });
        }
        if (content.length > 5000) {
            deleteFiles(images);
            return res.status(400).json({ errors: ["Post must be under 5000 characters"] });
        }
        if (images.length > MAX_IMAGES) {
            deleteFiles(images);
            return res.status(400).json({ errors: [`Post can have at most ${MAX_IMAGES} images`] });
        }

        const post = await Post.create({
            content: content.trim(),
            author: req.user.id,
            hashtags: extractHashtags(content),
            category: normalizeCategory(req.body.category),
            images,
            image: images[0] || null
        });

        await post.populate("author", "username name avatar");
        res.status(201).json({ message: "Post created", post });
    } catch (error) {
        return next(error);
    }
};

const removePostImage = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }
        const images = allImages(post);
        if (images.length === 0) {
            return res.status(400).json({ errors: ["No image on this post"] });
        }

        if (req.query.index === undefined) {
            deleteFiles(images);
            post.images = [];
            post.image = null;
        } else {
            const idx = parseInt(req.query.index, 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= images.length) {
                return res.status(400).json({ errors: ["Invalid image index"] });
            }
            deleteFiles([images[idx]]);
            images.splice(idx, 1);
            post.images = images;
            syncFirst(post);
        }
        post.editedAt = new Date();
        await post.save();

        res.json({ message: "Image removed", post });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

const addPostImages = async (req, res, next) => {
    try {
        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ errors: ["Image file is required"] });
        }
        const post = await Post.findById(req.params.id);
        if (!post) {
            deleteFiles(toPaths(files));
            return res.status(404).json({ errors: ["Post not found"] });
        }
        if (post.author.toString() !== req.user.id) {
            deleteFiles(toPaths(files));
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const current = allImages(post);
        const newPaths = toPaths(files);
        if (current.length + newPaths.length > MAX_IMAGES) {
            deleteFiles(newPaths);
            return res.status(400).json({ errors: [`Post can have at most ${MAX_IMAGES} images`] });
        }

        post.images = [...current, ...newPaths];
        syncFirst(post);
        post.editedAt = new Date();
        await post.save();
        await post.populate("author", "username name avatar");

        res.json({ message: "Images updated", post });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

module.exports = { createPostWithImage, removePostImage, addPostImages };
