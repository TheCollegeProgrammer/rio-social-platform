const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Mark every unread message in a conversation as read by this user
const markConversationRead = async (req, res, next) => {
    try {
        const convo = await Conversation.findById(req.params.id);
        if (!convo) return res.status(404).json({ errors: ["Conversation not found"] });
        if (!convo.participants.some((p) => p.toString() === req.user.id)) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        await Message.updateMany(
            { conversation: convo._id, sender: { $ne: req.user.id }, readBy: { $ne: req.user.id } },
            { $addToSet: { readBy: req.user.id } }
        );

        // Reset this user's unread counter on the conversation
        convo.unreadCounts = convo.unreadCounts || new Map();
        convo.unreadCounts.set(req.user.id, 0);
        await convo.save();

        res.json({ message: "Conversation marked read", unreadCount: 0 });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid conversation ID"] });
        }
        return next(error);
    }
};

// Unread stats for the nav badge: total messages + distinct users with unread
const getUnreadCount = async (req, res, next) => {
    try {
        const convos = await Conversation.find({ participants: req.user.id }).select("_id unreadCounts");
        const withUnread = convos.filter(
            (c) => ((c.unreadCounts && c.unreadCounts.get(req.user.id)) || 0) > 0
        );
        const unreadCount = await Message.countDocuments({
            conversation: { $in: withUnread.map((c) => c._id) },
            sender: { $ne: req.user.id },
            readBy: { $ne: req.user.id }
        });
        res.json({ unreadCount, unreadUsers: withUnread.length });
    } catch (error) {
        return next(error);
    }
};

module.exports = { markConversationRead, getUnreadCount };
