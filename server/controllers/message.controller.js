const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const findOrCreateConversation = async (userId, otherId) => {
    let convo = await Conversation.findOne({
        participants: { $all: [userId, otherId], $size: 2 }
    }).populate("participants", "username name avatar");
    if (!convo) {
        convo = await Conversation.create({ participants: [userId, otherId] });
        await convo.populate("participants", "username name avatar");
    }
    return convo;
};

const getConversations = async (req, res) => {
    try {
        const convos = await Conversation.find({ participants: req.user.id })
            .sort({ updatedAt: -1 })
            .populate("participants", "username name avatar");
        res.json({ conversations: convos });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

const getOrCreateConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        if (userId === req.user.id) {
            return res.status(400).json({ errors: ["Cannot message yourself"] });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ errors: ["User not found"] });
        const convo = await findOrCreateConversation(req.user.id, userId);
        res.json({ conversation: convo });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const getMessages = async (req, res) => {
    try {
        const convo = await Conversation.findById(req.params.id);
        if (!convo) return res.status(404).json({ errors: ["Conversation not found"] });
        if (!convo.participants.some((p) => p.toString() === req.user.id)) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 30;
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversation: convo._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("sender", "username name avatar"),
            Message.countDocuments({ conversation: convo._id })
        ]);

        res.json({
            messages: messages.reverse(),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid conversation ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ errors: ["Message content is required"] });
        }
        if (content.length > 2000) {
            return res.status(400).json({ errors: ["Message must be under 2000 characters"] });
        }

        const convo = await Conversation.findById(req.params.id);
        if (!convo) return res.status(404).json({ errors: ["Conversation not found"] });
        if (!convo.participants.some((p) => p.toString() === req.user.id)) {
            return res.status(403).json({ errors: ["Not authorized"] });
        }

        const message = await Message.create({
            conversation: convo._id,
            sender: req.user.id,
            content: content.trim(),
            readBy: [req.user.id]
        });

        convo.lastMessage = {
            content: content.trim(),
            sender: req.user.id,
            createdAt: message.createdAt
        };
        await convo.save();
        await message.populate("sender", "username name avatar");

        res.status(201).json({ message: "Message sent", data: message });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid conversation ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = {
    getConversations,
    getOrCreateConversation,
    getMessages,
    sendMessage
};
