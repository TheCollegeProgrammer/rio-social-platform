const Post = require("../models/post");
const User = require("../models/User");

const toggleBookmark = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ errors: ["Post not found"] });

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
                populate: { path: "author", select: "username name avatar" },
                options: { sort: { createdAt: -1 } }
            });

        res.json({ posts: user.bookmarks });
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
            : { content: { $regex: query, $options: "i" } };

        const posts = await Post.find(filter)
            .populate("author", "username name avatar")
            .sort({ createdAt: -1 })
            .limit(20);

        const userId = req.user ? req.user.id : null;
        const enriched = posts.map((post) => ({
            _id: post._id,
            content: post.content,
            author: post.author,
            likesCount: post.likes.length,
            liked: userId ? post.likes.some((id) => id.toString() === userId) : false,
            hashtags: post.hashtags,
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

        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: "i" } },
                { name: { $regex: query, $options: "i" } }
            ]
        })
            .select("username name avatar bio isPrivate")
            .limit(20);

        res.json({ users });
    } catch (error) {
        return next(error);
    }
};

module.exports = { toggleBookmark, getBookmarks, searchPosts, searchUsers };
