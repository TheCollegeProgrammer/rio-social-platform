const Post = require("../models/post");
const { normalizeCategory } = require("../config/categories");

const extractHashtags = (content) => {
    const matches = content.match(/#\w+/g);
    return matches ? [...new Set(matches.map((h) => h.toLowerCase()))] : [];
};

const postImages = (post) =>
    post.images?.length ? post.images : post.image ? [post.image] : [];

const createPost = async (req, res, next) => {
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
            category: normalizeCategory(req.body.category)
        });

        await post.populate("author", "username name avatar");
        res.status(201).json({ message: "Post created", post });
    } catch (error) {
        return next(error);
    }
};

const getPostById = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("author", "username name avatar");

        if (!post) return res.status(404).json({ errors: ["Post not found"] });

        const userId = req.user ? req.user.id : null;
        const liked = userId ? post.likes.some((id) => id.toString() === userId) : false;

        res.json({
            post: {
                _id: post._id,
                content: post.content,
                author: post.author,
                likesCount: post.likes.length,
                liked,
                hashtags: post.hashtags,
                image: post.image,
                images: postImages(post),
                category: post.category,
                editedAt: post.editedAt,
                createdAt: post.createdAt
            }
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

const getPosts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const imageOnly = req.query.imageOnly === "1" || req.query.imageOnly === "true";
        const filter = {};
        if (imageOnly) filter.image = { $ne: null };
        const category = normalizeCategory(req.query.category);
        if (category) filter.category = category;

        const posts = await Post.find(filter)
            .populate("author", "username name avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Post.countDocuments(filter);
        const userId = req.user ? req.user.id : null;

        const enriched = posts.map((post) => ({
            _id: post._id,
            content: post.content,
            author: post.author,
            likesCount: post.likes.length,
            liked: userId ? post.likes.some((id) => id.toString() === userId) : false,
            hashtags: post.hashtags,
            image: post.image,
            images: postImages(post),
            category: post.category,
            editedAt: post.editedAt,
            createdAt: post.createdAt
        }));

        res.json({
            posts: enriched,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        return next(error);
    }
};

let trendingCache = { at: 0, tags: null };

const getTrendingHashtags = async (req, res, next) => {
    try {
        if (trendingCache.tags && Date.now() - trendingCache.at < 60000) {
            return res.json({ hashtags: trendingCache.tags });
        }

        const rows = await Post.aggregate([
            { $project: { hashtags: 1 } },
            { $unwind: "$hashtags" },
            { $group: { _id: "$hashtags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 12 }
        ]);

        const hashtags = rows.map((r) => ({ tag: r._id, count: r.count }));
        trendingCache = { at: Date.now(), tags: hashtags };
        res.json({ hashtags });
    } catch (error) {
        return next(error);
    }
};

module.exports = { createPost, getPostById, getPosts, getTrendingHashtags, extractHashtags, postImages };
