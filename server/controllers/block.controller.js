const Block = require("../models/Block");
const User = require("../models/User");
const FollowRequest = require("../models/FollowRequest");

const blockUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (id === userId) {
            return res.status(400).json({ errors: ["Cannot block yourself"] });
        }
        const target = await User.findById(id);
        if (!target) return res.status(404).json({ errors: ["User not found"] });

        try {
            await Block.create({ blocker: userId, blocked: id });
        } catch (err) {
            // Unique index: a double-click just means already blocked.
            if (err.code !== 11000) throw err;
        }

        // 6.1: a block severs every edge between the pair - mutual follows
        // and pending/approved follow requests both go.
        const [me, them] = await Promise.all([
            User.findById(userId),
            User.findById(id)
        ]);
        let changed = false;
        const edges = [
            [me, "following", id],
            [me, "followers", id],
            [them, "following", userId],
            [them, "followers", userId]
        ];
        for (const [doc, field, otherId] of edges) {
            if (doc[field].some((x) => x.toString() === otherId)) {
                doc[field].pull(otherId);
                changed = true;
            }
        }
        if (changed) await Promise.all([me.save(), them.save()]);
        await FollowRequest.deleteMany({
            $or: [
                { requester: userId, target: id },
                { requester: id, target: userId }
            ]
        });

        res.json({
            blocked: true,
            followersCount: them.followers.length,
            followingCount: me.following.length
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

// Idempotent: unblocking someone who was never blocked is a no-op 200.
// Follow edges are deliberately NOT restored - unblock is not an undo.
const unblockUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ errors: ["Cannot block yourself"] });
        }
        await Block.deleteOne({ blocker: req.user.id, blocked: id });
        res.json({ blocked: false });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

module.exports = { blockUser, unblockUser };
