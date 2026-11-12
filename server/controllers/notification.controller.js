const Notification = require("../models/Notification");
const { emitToUser } = require("../socket");
const { blockedEither, mutedBy } = require("../utils/socialGraph");

const createNotification = async (data) => {
    try {
        if (String(data.recipient) === String(data.sender)) return null;
        // 6.1/6.2: blocks silence everything crossing them; mutes drop the
        // muted sender's notifications to the muter (feed suppression only
        // would still leak activity through the badge). 6.8: moderation and
        // appeal outcomes are system decisions - they must reach the user.
        const system = ["moderation", "appeal_approved", "appeal_denied"].includes(data.type);
        if (!system && await blockedEither(data.recipient, data.sender)) return null;
        if (!system && await mutedBy(data.recipient, data.sender)) return null;
        // 6.6: a re-mention from an edit or a retry must not double-notify.
        if (data.type === "mention") {
            const dup = await Notification.exists({
                recipient: data.recipient,
                sender: data.sender,
                type: "mention",
                ...(data.post ? { post: data.post } : {}),
                ...(data.comment ? { comment: data.comment } : {})
            });
            if (dup) return null;
        }
        const notification = await Notification.create(data);
        // 5.8: emit only after the notification is persisted; populate so
        // the push payload matches the REST list shape. Recipient room =
        // all of their live devices.
        await notification.populate([
            { path: "sender", select: "name username" },
            { path: "post", select: "content" },
            { path: "comment", select: "content" },
            { path: "report", select: "status resolution targetType" }
        ]);
        emitToUser(String(data.recipient), "notification:new", notification);
        return notification;
    } catch {
        return null;
    }
};

const getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ recipient: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("sender", "name username")
                .populate("post", "content")
                .populate("comment", "content")
                .populate("report", "status resolution targetType"),
            Notification.countDocuments({ recipient: req.user.id }),
            Notification.countDocuments({ recipient: req.user.id, read: false })
        ]);

        res.json({
            notifications,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            unreadCount
        });
    } catch (error) {
        return next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ errors: ["Notification not found"] });
        }
        res.json({ notification });
    } catch (error) {
        return next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        return next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user.id
        });
        if (!notification) {
            return res.status(404).json({ errors: ["Notification not found"] });
        }
        res.json({ message: "Notification deleted" });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
