const User = require("../models/User");
const FollowRequest = require("../models/FollowRequest");
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
        } else if (targetUser.isPrivate === true) {
            // 6.4: private accounts turn the follow button into a request
            // toggle - a second click cancels the pending request.
            const existing = await FollowRequest.findOne({
                requester: userId,
                target: id
            });
            if (existing && existing.status === "pending") {
                await existing.deleteOne();
                return res.json({
                    following: false,
                    pending: false,
                    followersCount: targetUser.followers.length,
                    followingCount: currentUser.following.length
                });
            }
            if (existing) {
                existing.status = "pending";
                await existing.save();
            } else {
                try {
                    await FollowRequest.create({ requester: userId, target: id });
                } catch (err) {
                    // Unique index: a concurrent double-click already created it.
                    if (err.code !== 11000) throw err;
                }
            }
            createNotification({
                recipient: id,
                sender: userId,
                type: "follow_request"
            });
            return res.json({
                following: false,
                pending: true,
                followersCount: targetUser.followers.length,
                followingCount: currentUser.following.length
            });
        } else {
            // addToSet: retried/duplicate requests can never create dup edges.
            currentUser.following.addToSet(id);
            targetUser.followers.addToSet(userId);
            // A direct follow supersedes any earlier request record.
            FollowRequest.deleteOne({ requester: userId, target: id }).catch(() => {});
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
            pending: false,
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
