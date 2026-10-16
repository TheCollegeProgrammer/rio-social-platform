const Conversation = require("../models/Conversation");
const User = require("../models/User");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Users I have NO conversation with yet (powers the "new conversation" picker)
const getNewChatUsers = async (req, res, next) => {
    try {
        const convos = await Conversation.find({ participants: req.user.id }).select("participants");
        const existing = new Set([req.user.id]);
        convos.forEach((c) => c.participants.forEach((p) => existing.add(p.toString())));

        const filter = { _id: { $nin: [...existing] } };
        const q = String(req.query.q || "").trim();
        if (q) {
            const rx = { $regex: escapeRegex(q), $options: "i" };
            filter.$or = [{ username: rx }, { name: rx }];
        }

        const users = await User.find(filter)
            .select("username name avatar bio")
            .sort({ name: 1 })
            .limit(30);

        res.json({ users });
    } catch (error) {
        return next(error);
    }
};

module.exports = { getNewChatUsers };
