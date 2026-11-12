const Post = require("../models/post");
const User = require("../models/User");
const { postImages } = require("./post.controller");
const { buildPostVisibility } = require("../utils/visibility");
const { blockedIdsFor } = require("../utils/socialGraph");
const { canViewPost } = require("../utils/visibility");

// F-11: user-supplied search text is interpolated into Mongo $regex - it
// must be escaped so `(`/`.*` etc. are matched literally (ReDoS/regex
// injection). Same helper as message-users.controller.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toggleBookmark = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });
        // 6.3: bookmarking is per-user storage, but you cannot bookmark a
        // post you are not allowed to see (private/blocked -> 404).
        if (!(await canViewPost(req.user.id, post))) {
            return res.status(404).json({ errors: ["Post not found"] });
        }

        const user = await User.findById(req.user.id);
        const isBookmarked = user.bookmarks.some(
            (id) => id.toString() === req.params.id
        );

        if (isBookmarked) user.bookmarks.pull(req.params.id);
        else user.bookmarks.push(req.params.id);

        await user.save();
        res.json({ bookmarked: !isBookmarked });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid post ID"] });
        }
        return next(error);
    }
};

const getBookmarks = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .select("bookmarks")
            .populate({
                path: "bookmarks",
                populate: [
                    { path: "author", select: "username name avatar isPrivate" },
                    { path: "mentions", select: "username name avatar" }
                ],
                options: { sort: { createdAt: -1 } }
            });

        const vis = await buildPostVisibility(req.user.id);
        // 6.1: bookmarked posts of blocked accounts disappear too.
        const blocked = new Set(await blockedIdsFor(req.user.id));
        res.json({
            posts: user.bookmarks.filter(
                (p) => !vis.hidden(p) && !blocked.has(String(p.author?._id ?? p.author))
            )
        });
    } catch (error) {
        return next(error);
    }
};

const searchPosts = async (req, res, next) => {
    try {
        let hashtag = (req.query.hashtag || "").trim().toLowerCase();
        if (hashtag && !hashtag.startsWith("#")) hashtag = `#${hashtag}`;
        const query = (req.query.q || "").trim();

        if (!query && !hashtag) return res.json({ posts: [] });

        const filter = hashtag
            ? { hashtags: hashtag }
            : { content: { $regex: escapeRegex(query), $options: "i" } };
        const userId = req.user ? req.user.id : null;
        // 6.1: blocked authors cannot surface in content search.
        const blocked = await blockedIdsFor(userId);
        if (blocked.length) filter.author = { $nin: blocked };

        const posts = await Post.find(filter)
            .populate("author", "username name avatar isPrivate")
            .populate("mentions", "username name avatar")
            .sort({ createdAt: -1 })
            .limit(20);

        const vis = await buildPostVisibility(userId);
        const visible = posts.filter((post) => !vis.hidden(post));
        const enriched = visible.map((post) => ({
            _id: post._id,
            content: post.content,
            author: post.author,
            likesCount: post.likes.length,
            liked: userId ? post.likes.some((id) => id.toString() === userId) : false,
            hashtags: post.hashtags,
            image: post.image,
            images: postImages(post),
            visibility: post.visibility,
            mentions: post.mentions,
            pinnedAt: post.pinnedAt,
            createdAt: post.createdAt
        }));

        res.json({ posts: enriched });
    } catch (error) {
        return next(error);
    }
};

const searchUsers = async (req, res, next) => {
    try {
        const query = (req.query.q || "").trim();
        if (!query) return res.json({ users: [] });

        // 6.1: blocked accounts never appear in people search (either side).
        const blocked = await blockedIdsFor(req.user.id);
        const users = await User.find({
            $or: [
                { username: { $regex: escapeRegex(query), $options: "i" } },
                { name: { $regex: escapeRegex(query), $options: "i" } }
            ],
            ...(blocked.length ? { _id: { $nin: blocked } } : {})
        })
            .select("username name avatar bio isPrivate")
            .limit(20);

        res.json({ users });
    } catch (error) {
        return next(error);
    }
};

module.exports = { toggleBookmark, getBookmarks, searchPosts, searchUsers };
