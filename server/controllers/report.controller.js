const Report = require("../models/Report");
const Post = require("../models/post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { canViewPost } = require("../utils/visibility");

// 6.7: report intake. Visibility rules apply - you can only report content
// you are actually allowed to see, and never your own.
const createReport = async (req, res, next) => {
    try {
        const { targetType, targetId, reason } = req.body || {};
        if (!["post", "comment", "user"].includes(targetType)) {
            return res.status(400).json({ errors: ["targetType must be post, comment or user"] });
        }
        const cleanReason = String(reason || "").trim();
        if (!cleanReason) return res.status(400).json({ errors: ["A reason is required"] });
        if (cleanReason.length > 500) {
            return res.status(400).json({ errors: ["Reason must be under 500 characters"] });
        }

        let target;
        if (targetType === "post") {
            target = await Post.findById(targetId);
            if (!target) return res.status(404).json({ errors: ["Post not found"] });
            if (String(target.author) === req.user.id) {
                return res.status(400).json({ errors: ["You cannot report your own post"] });
            }
            if (!(await canViewPost(req.user.id, target))) {
                return res.status(404).json({ errors: ["Post not found"] });
            }
        } else if (targetType === "comment") {
            target = await Comment.findById(targetId);
            if (!target) return res.status(404).json({ errors: ["Comment not found"] });
            if (String(target.author) === req.user.id) {
                return res.status(400).json({ errors: ["You cannot report your own comment"] });
            }
            const parent = await Post.findById(target.post);
            if (!(await canViewPost(req.user.id, parent))) {
                return res.status(404).json({ errors: ["Comment not found"] });
            }
        } else {
            target = await User.findById(targetId).select("_id");
            if (!target) return res.status(404).json({ errors: ["User not found"] });
            if (String(target._id) === req.user.id) {
                return res.status(400).json({ errors: ["You cannot report yourself"] });
            }
        }

        const duplicate = await Report.exists({
            reporter: req.user.id,
            targetType,
            targetId: target._id,
            status: { $in: ["open", "reviewing"] }
        });
        if (duplicate) {
            return res.status(409).json({ errors: ["You already have an open report for this"] });
        }

        const report = await Report.create({
            reporter: req.user.id,
            targetType,
            targetId: target._id,
            reason: cleanReason
        });
        res.status(201).json({ message: "Report submitted", report });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid target ID"] });
        }
        return next(error);
    }
};

module.exports = { createReport };
