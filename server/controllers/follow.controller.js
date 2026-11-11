const User = require("../models/User");
const { createNotification } = require("./notification.controller");
const { buildPostVisibility } = require("../utils/visibility");

const toggleFollow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (id === userId) {
            return res.status(400).json({ errors: ["Cannot follow yourself"] });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) {
            return res.status(404).json({ errors: ["User not found"] });
        }

        const currentUser = await User.findById(userId);
        const isFollowing = currentUser.following.some(
            (f) => f.toString() === id
        );

        if (isFollowing) {
            currentUser.following.pull(id);
            targetUser.followers.pull(userId);
        } else {
            currentUser.following.push(id);
            targetUser.followers.push(userId);
            createNotification({
                recipient: id,
                sender: userId,
                type: "follow"
            });
        }

        await currentUser.save();
        await targetUser.save();

        res.json({
            following: !isFollowing,
            followersCount: targetUser.followers.length,
            followingCount: currentUser.following.length
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

const getFollowers = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select("followers isPrivate")
            .populate("followers", "username name avatar bio");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        // F-13: private accounts hide their social graph from non-followers.
        if (user.isPrivate === true) {
            const vis = await buildPostVisibility(req.user.id);
            if (!vis.canSeeLists(user._id, true)) {
                return res.status(403).json({ errors: ["This account is private"] });
            }
        }

        res.json({ followers: user.followers });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

const getFollowing = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select("following isPrivate")
            .populate("following", "username name avatar bio");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        if (user.isPrivate === true) {
            const vis = await buildPostVisibility(req.user.id);
            if (!vis.canSeeLists(user._id, true)) {
                return res.status(403).json({ errors: ["This account is private"] });
            }
        }

        res.json({ following: user.following });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

module.exports = { toggleFollow, getFollowers, getFollowing };
