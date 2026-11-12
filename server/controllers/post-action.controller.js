const Post = require("../models/post");
const User = require("../models/User");
const { extractHashtags } = require("./post.controller");
const { createNotification } = require("./notification.controller");
const { blockedEither } = require("../utils/socialGraph");
const { canViewPost, parseVisibility } = require("../utils/visibility");
const { resolveMentions, notifyMentions } = require("../utils/mentions");

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
        post.mentions = await resolveMentions(content);
        if (req.body.visibility !== undefined) {
            const vis = parseVisibility(req.body.visibility);
            if (!vis.ok) {
                return res.status(400).json({ errors: ["visibility must be public or followers"] });
            }
            post.visibility = vis.value;
        }
        post.editedAt = new Date();
        await post.save();
        // 6.6: re-mention notifications are deduped inside createNotification.
        await notifyMentions(post.mentions, req.user.id, { post: post._id });
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
            // F-08: local files unlink now; Cloudinary assets go through the
            // durable retry queue (no silent orphans on API failures).
            require("../utils/media").deleteMedia(imgs);
        }
        await post.deleteOne();

        // P0-07: log moderator/admin removals (self-deletes need no audit).
        if (req.user.id !== post.author.toString()) {
            const { logAudit } = require("../utils/audit");
            await logAudit(req, {
                actor: req.user.id,
                action: "post.delete",
                targetType: "post",
                targetId: post._id,
                meta: { author: post.author.toString() }
            });
        }

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
        // 6.1: likes are an interaction - blocked pairs cannot create them.
        if (await blockedEither(userId, post.author)) {
            return res.status(403).json({ errors: ["Cannot interact with this user"] });
        }
        // 6.3: you cannot like what you are not allowed to see.
        if (!(await canViewPost(userId, post))) {
            return res.status(404).json({ errors: ["Post not found"] });
        }
        const alreadyLiked = post.likes.some((id) => id.toString() === userId);

        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            alreadyLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
            { new: true }
        );

        if (!alreadyLiked) {
            await createNotification({
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
