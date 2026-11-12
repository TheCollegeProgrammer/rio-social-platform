const User = require("../models/User");
const Post = require("../models/post");
const FollowRequest = require("../models/FollowRequest");
const Block = require("../models/Block");
const { buildPostVisibility } = require("../utils/visibility");

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -email -resetPasswordToken -resetPasswordExpires")
            .populate("followers", "username name avatar")
            .populate("following", "username name avatar");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        const viewerId = req.user ? req.user.id : null;
        // 6.1: if the target blocked the viewer the profile is unavailable;
        // the reverse direction stays visible so the blocker can unblock.
        let blockedByYou = false;
        if (viewerId && String(viewerId) !== String(user._id)) {
            const edge = await Block.findOne({
                $or: [
                    { blocker: viewerId, blocked: user._id },
                    { blocker: user._id, blocked: viewerId }
                ]
            });
            if (edge && String(edge.blocker) === String(user._id)) {
                return res.status(403).json({ errors: ["This account is unavailable"] });
            }
            blockedByYou = !!edge;
        }

        const posts = await Post.find({ author: user._id })
            .populate("author", "username name avatar isPrivate")
            .sort({ createdAt: -1 })
            .limit(50);
        // F-13: private accounts show posts only to self/admin/followers.
        const vis = await buildPostVisibility(req.user ? req.user.id : null);
        const visible = posts.filter((p) => !vis.hidden(p));

        const postsCount = await Post.countDocuments({ author: user._id });
        const followersCount = user.followers.length;
        const followingCount = user.following.length;
        const isFollowing = user.followers.some((f) => f && String(f._id) === viewerId);
        // 6.4: let the profile button render "Requested" for a pending ask.
        let followRequested = false;
        if (viewerId && !isFollowing && user.isPrivate === true) {
            followRequested = !!(await FollowRequest.exists({
                requester: viewerId,
                target: user._id,
                status: "pending"
            }));
        }

        res.json({
            profile: {
                _id: user._id,
                username: user.username,
                name: user.name,
                age: user.age,
                bio: user.bio,
                avatar: user.avatar,
                coverImage: user.coverImage,
                isPrivate: user.isPrivate,
                isFollowing,
                followRequested,
                blockedByYou,
                followersCount,
                followingCount,
                postsCount,
                createdAt: user.createdAt
            },
            posts: visible
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, username, bio, isPrivate } = req.body;
        const errors = [];

        if (name !== undefined && (name.length < 1 || name.length > 50)) {
            errors.push("Name must be 1-50 characters");
        }
        if (username !== undefined && (username.length < 3 || username.length > 30)) {
            errors.push("Username must be 3-30 characters");
        }
        if (bio !== undefined && bio.length > 200) {
            errors.push("Bio must be under 200 characters");
        }

        if (username) {
            const existing = await User.findOne({
                username,
                _id: { $ne: req.user.id }
            });
            if (existing) errors.push("Username already taken");
        }

        if (errors.length > 0) return res.status(400).json({ errors });

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (username !== undefined) updates.username = username;
        if (bio !== undefined) updates.bio = bio;
        if (isPrivate !== undefined) updates.isPrivate = isPrivate;
        // F-14: avatar/coverImage are intentionally NOT updatable here - only
        // the validated upload endpoints may set media URLs. Accepting an
        // arbitrary URL here let a user point at another account's asset and
        // trigger its destruction on their next upload/delete.

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        res.json({ message: "Profile updated", user });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        if (error.code === 11000) {
            return res.status(409).json({ errors: ["Username already taken"] });
        }
        return next(error);
    }
};

const deleteAccount = require("./account-delete.controller").deleteAccount;

module.exports = { getProfile, updateProfile, deleteAccount };
