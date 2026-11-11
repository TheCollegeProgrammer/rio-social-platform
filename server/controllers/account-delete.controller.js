const User = require("../models/User");
const Post = require("../models/post");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { verifyPassword } = require("../utils/password");
const { revokeAllForUser } = require("../utils/sessions");
const { deleteMedia } = require("../utils/media");
const { logAudit } = require("../utils/audit");
const { clearAuthCookies } = require("./auth.controller");

const imagesOf = (post) =>
    post.images?.length ? post.images : post.image ? [post.image] : [];

// P0-08/F-09: staged, retry-safe deletion.
//  - password comes from the BODY only (query-string secrets leak into
//    request logs) and is verified before anything is touched;
//  - dependent data is removed first, the user document LAST, so a crash
//    mid-way leaves a retryable state (every stage is idempotent);
//  - sessions are revoked, media goes through the cleanup queue, and the
//    removal itself is recorded in the audit log (ids kept, no PII).
const deleteAccount = async (req, res, next) => {
    try {
        const password = req.body?.password;
        if (!password) {
            return res.status(400).json({ errors: ["Password required"] });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res
                .status(401)
                .json({ errors: ["Not authenticated"], message: "Not authenticated" });
        }
        const match = await verifyPassword(user.password, password);
        if (!match) {
            return res.status(400).json({ errors: ["Password is incorrect"] });
        }

        const posts = await Post.find({ author: user._id }).select("images image");
        const postIds = posts.map((p) => p._id);
        if (posts.length) deleteMedia(posts.flatMap(imagesOf));

        await Comment.deleteMany({
            $or: [{ author: user._id }, { post: { $in: postIds } }]
        });
        await Post.deleteMany({ author: user._id });
        await Notification.deleteMany({
            $or: [
                { recipient: user._id },
                { sender: user._id },
                { post: { $in: postIds } }
            ]
        });
        await User.updateMany({ followers: user._id }, { $pull: { followers: user._id } });
        await User.updateMany({ following: user._id }, { $pull: { following: user._id } });
        await User.updateMany(
            { bookmarks: { $in: postIds } },
            { $pull: { bookmarks: { $in: postIds } } }
        );

        const convos = await Conversation.find({ participants: user._id }).select("_id");
        const convoIds = convos.map((c) => c._id);
        if (convoIds.length) {
            await Message.deleteMany({ conversation: { $in: convoIds } });
            await Conversation.deleteMany({ _id: { $in: convoIds } });
        }

        await revokeAllForUser(user._id);
        await logAudit(req, {
            actor: user._id,
            action: "user.delete",
            targetType: "user",
            targetId: user._id
        });
        await User.deleteOne({ _id: user._id });

        clearAuthCookies(res);
        res.json({ message: "Account deleted successfully" });
    } catch (error) {
        return next(error);
    }
};

module.exports = { deleteAccount };
