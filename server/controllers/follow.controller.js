const User = require("../models/User");
const { createNotification } = require("./notification.controller");

const toggleFollow = async (req, res) => {
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
        res.status(500).json({ errors: ["Server error"] });
    }
};

const getFollowers = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("followers")
            .populate("followers", "username name avatar bio");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        res.json({ followers: user.followers });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const getFollowing = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("following")
            .populate("following", "username name avatar bio");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        res.json({ following: user.following });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { toggleFollow, getFollowers, getFollowing };
