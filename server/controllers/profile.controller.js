const User = require("../models/User");
const Post = require("../models/post");

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -email -resetPasswordToken")
            .populate("followers", "username name avatar")
            .populate("following", "username name avatar");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        const posts = await Post.find({ author: user._id })
            .populate("author", "username name avatar")
            .sort({ createdAt: -1 })
            .limit(50);

        const postsCount = await Post.countDocuments({ author: user._id });
        const followersCount = user.followers.length;
        const followingCount = user.following.length;
        const isFollowing = user.followers.some((f) => f && String(f._id) === req.user.id);

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
                followersCount,
                followingCount,
                postsCount,
                createdAt: user.createdAt
            },
            posts
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        res.status(500).json({ errors: ["Server error"] });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, username, bio, avatar, isPrivate } = req.body;
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
        if (avatar !== undefined) updates.avatar = avatar;
        if (isPrivate !== undefined) updates.isPrivate = isPrivate;

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
        res.status(500).json({ errors: ["Server error"] });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const password = req.body?.password || req.query?.password;

        if (!password) {
            return res.status(400).json({ errors: ["Password required"] });
        }

        const bcrypt = require("bcrypt");
        const user = await User.findById(req.user.id);

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ errors: ["Password is incorrect"] });
        }

        await Post.deleteMany({ author: user._id });
        const Comment = require("../models/Comment");
        await Comment.deleteMany({ author: user._id });
        await User.updateMany(
            { followers: user._id },
            { $pull: { followers: user._id } }
        );
        await User.updateMany(
            { following: user._id },
            { $pull: { following: user._id } }
        );
        await User.findByIdAndDelete(user._id);

        res.clearCookie("token");
        res.json({ message: "Account deleted successfully" });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { getProfile, updateProfile, deleteAccount };
