const Notification = require("../models/Notification");

const createNotification = async (data) => {
    try {
        if (String(data.recipient) === String(data.sender)) return null;
        return await Notification.create(data);
    } catch {
        return null;
    }
};

const getNotifications = async (req, res) => {
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
                .populate("comment", "content"),
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
        res.status(500).json({ errors: ["Server error"] });
    }
};

const markAsRead = async (req, res) => {
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
        res.status(500).json({ errors: ["Server error"] });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

const deleteNotification = async (req, res) => {
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
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
