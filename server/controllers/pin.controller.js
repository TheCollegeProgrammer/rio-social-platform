const Post = require("../models/post");

// 6.9: capped so the profile grid stays a curated highlight, not a second feed.
const PIN_LIMIT = 3;

const togglePin = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ errors: ["Only the owner can pin posts"] });
        }

        if (post.pinnedAt) {
            post.pinnedAt = null;
        } else {
            const pinned = await Post.countDocuments({
                author: req.user.id,
                pinnedAt: { $type: "date" }
            });
            if (pinned >= PIN_LIMIT) {
                return res.status(400).json({ errors: [`You can pin up to ${PIN_LIMIT} posts`] });
            }
            post.pinnedAt = new Date();
        }
        await post.save();
        res.json({ pinned: !!post.pinnedAt });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

module.exports = { togglePin, PIN_LIMIT };
