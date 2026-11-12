const User = require("../models/User");
const FollowRequest = require("../models/FollowRequest");
const { createNotification } = require("./notification.controller");
const { blockedEither } = require("../utils/socialGraph");

const toggleFollow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (id === userId) {
            return res.status(400).json({ errors: ["Cannot follow yourself"] });
        }
        // 6.1: no follow edge may cross a block in either direction.
        if (await blockedEither(userId, id)) {
            return res.status(403).json({ errors: ["Cannot interact with this user"] });
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
            await createNotification({
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
            await createNotification({
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

module.exports = { toggleFollow };
