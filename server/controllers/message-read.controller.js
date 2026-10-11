const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Mark every unread message in a conversation as read by this user
const markConversationRead = async (req, res) => {
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
        res.status(500).json({ errors: ["Server error"] });
    }
};

// Total unread messages across all conversations (for the nav badge)
const getUnreadCount = async (req, res) => {
    try {
        const convos = await Conversation.find({ participants: req.user.id }).select("_id");
        const ids = convos.map((c) => c._id);
        const unreadCount = await Message.countDocuments({
            conversation: { $in: ids },
            sender: { $ne: req.user.id },
            readBy: { $ne: req.user.id }
        });
        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { markConversationRead, getUnreadCount };
