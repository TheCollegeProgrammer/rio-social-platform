const Post = require("../models/post");
const { normalizeCategory } = require("../config/categories");
const { buildPostVisibility, parseVisibility } = require("../utils/visibility");
const { blockedEither } = require("../utils/socialGraph");

const extractHashtags = (content) => {
    const matches = content.match(/#\w+/g);
    return matches ? [...new Set(matches.map((h) => h.toLowerCase()))] : [];
};

const postImages = require("../utils/postShape").postImages;

const createPost = async (req, res, next) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Post content is required"] });
        }
        if (content.length > 5000) {
            return res.status(400).json({ errors: ["Post must be under 5000 characters"] });
        }
        const vis = parseVisibility(req.body.visibility);
        if (!vis.ok) {
            return res.status(400).json({ errors: ["visibility must be public or followers"] });
        }

        const post = await Post.create({
            content: content.trim(),
            author: req.user.id,
            hashtags: extractHashtags(content),
            category: normalizeCategory(req.body.category),
            visibility: vis.value
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
            .populate("author", "username name avatar isPrivate");

        if (!post) return res.status(404).json({ errors: ["Post not found"] });

        const userId = req.user ? req.user.id : null;
        // 6.1: a blocked author's post is as invisible as a private one.
        if (userId && await blockedEither(userId, post.author._id ?? post.author)) {
            return res.status(404).json({ errors: ["Post not found"] });
        }
        // F-13: a private author's post is invisible to non-followers -> 404
        // (existence itself must not leak).
        const vis = await buildPostVisibility(userId);
        if (vis.hidden(post)) return res.status(404).json({ errors: ["Post not found"] });

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
                visibility: post.visibility,
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

let trendingCache = { at: 0, tags: null };

const getTrendingHashtags = async (req, res, next) => {
    try {
        if (trendingCache.tags && Date.now() - trendingCache.at < 60000) {
            return res.json({ hashtags: trendingCache.tags });
        }

        // 6.3: private authors' tags never surface in the global trending
        // list - it is cached per-app, so the exclusion must be viewer
        // independent (blocks/mutes are per-viewer and stay out of scope
        // here; tags are shared strings, not author-attributed content).
        const rows = await Post.aggregate([
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
            { $match: { "author.isPrivate": { $ne: true } } },
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

module.exports = { createPost, getPostById, getTrendingHashtags, extractHashtags, postImages };
