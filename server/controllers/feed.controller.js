const Post = require("../models/post");
const { normalizeCategory } = require("../config/categories");
const { buildPostVisibility } = require("../utils/visibility");
const { decodeCursor, encodeCursor, cursorFilter } = require("../utils/cursor");
const { postImages } = require("../utils/postShape");

const PAGE_FALLBACK = 10;
const MAX_LIMIT = 50;

const getPosts = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || PAGE_FALLBACK, 1), MAX_LIMIT);
        const imageOnly = req.query.imageOnly === "1" || req.query.imageOnly === "true";

        const base = {};
        if (imageOnly) base.image = { $ne: null };
        const category = normalizeCategory(req.query.category);
        if (category) base.category = category;

        // Cursor mode when a valid cursor is present; invalid cursors fall
        // back to page mode so consumers never hard-fail on stale links.
        const cursor = decodeCursor(req.query.cursor);
        const filter = cursor ? { $and: [base, cursorFilter(cursor)] } : base;
        const skip = cursor ? 0 : (page - 1) * limit;

        const docs = await Post.find(filter)
            .populate("author", "username name avatar isPrivate")
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit + 1);

        const hasMore = docs.length > limit;
        const pageDocs = hasMore ? docs.slice(0, limit) : docs;
        const total = await Post.countDocuments(base);
        const userId = req.user ? req.user.id : null;
        // F-13: hide posts of private accounts from non-followers.
        const vis = await buildPostVisibility(userId);
        const visible = pageDocs.filter((post) => !vis.hidden(post));

        const enriched = visible.map((post) => ({
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

        const last = pageDocs[pageDocs.length - 1];
        res.json({
            posts: enriched,
            page,
            totalPages: Math.ceil(total / limit),
            total,
            hasMore,
            nextCursor: hasMore && last ? encodeCursor(last) : null
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = { getPosts };
