const Mute = require("../models/Mute");
const User = require("../models/User");

// 6.2: mute/unmute are soft, idempotent toggles - no follow edges or
// requests are touched, interactions keep working in both directions.
const muteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (id === userId) {
            return res.status(400).json({ errors: ["Cannot mute yourself"] });
        }
        const target = await User.findById(id);
        if (!target) return res.status(404).json({ errors: ["User not found"] });

        try {
            await Mute.create({ muter: userId, muted: id });
        } catch (err) {
            // Unique index: a double-click just means already muted.
            if (err.code !== 11000) throw err;
        }
        res.json({ muted: true });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

const unmuteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ errors: ["Cannot mute yourself"] });
        }
        await Mute.deleteOne({ muter: req.user.id, muted: id });
        res.json({ muted: false });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

module.exports = { muteUser, unmuteUser };
