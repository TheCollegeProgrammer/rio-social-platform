const Report = require("../models/Report");
const Post = require("../models/post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("./notification.controller");

const STATUSES = ["open", "reviewing", "resolved", "dismissed"];

// 6.7: queue with status/type filters and pagination.
const listReports = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const filter = {};
        if (req.query.status) {
            if (!STATUSES.includes(req.query.status)) {
                return res.status(400).json({ errors: ["Unknown status filter"] });
            }
            filter.status = req.query.status;
        }
        if (req.query.targetType) {
            if (!["post", "comment", "user"].includes(req.query.targetType)) {
                return res.status(400).json({ errors: ["Unknown targetType filter"] });
            }
            filter.targetType = req.query.targetType;
        }

        const [reports, total] = await Promise.all([
            Report.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("reporter", "username name avatar"),
            Report.countDocuments(filter)
        ]);

        res.json({ reports, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        return next(error);
    }
};

// Context view: enough to judge the report, never emails/credentials.
const loadContext = async (report) => {
    if (report.targetType === "post") {
        const post = await Post.findById(report.targetId)
            .populate("author", "username name avatar isPrivate isSuspended")
            .select("content author createdAt visibility");
        return post ? { kind: "post", ...post.toObject() } : null;
    }
    if (report.targetType === "comment") {
        const comment = await Comment.findById(report.targetId)
            .populate("author", "username name avatar isPrivate isSuspended")
            .select("content author post createdAt");
        return comment ? { kind: "comment", ...comment.toObject() } : null;
    }
    const user = await User.findById(report.targetId)
        .select("username name avatar bio isPrivate isSuspended createdAt");
    return user ? { kind: "user", ...user.toObject() } : null;
};

const getReport = async (req, res, next) => {
    try {
        const report = await Report.findById(req.params.id).populate("reporter", "username name avatar");
        if (!report) return res.status(404).json({ errors: ["Report not found"] });
        const context = await loadContext(report);
        res.json({ report, context });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid report ID"] });
        }
        return next(error);
    }
};

// Status transitions + optional resolution note, audit-trailed.
const updateReport = async (req, res, next) => {
    try {
        const { status, resolution } = req.body || {};
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ errors: ["Status must be open, reviewing, resolved or dismissed"] });
        }
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ errors: ["Report not found"] });
        const wasResolved = report.status === "resolved";

        report.status = status;
        if (resolution !== undefined) report.resolution = String(resolution).slice(0, 500);
        report.handledBy = req.user.id;
        report.handledAt = new Date();
        await report.save();
        await report.populate("reporter", "username name avatar");

        // 6.8: tell the affected user about the adverse decision so they can appeal.
        if (status === "resolved" && !wasResolved) {
            const context = await loadContext(report);
            const subject = context
                ? (context.kind === "user" ? String(context._id) : String(context.author?._id || ""))
                : "";
            if (subject && subject !== req.user.id) {
                await createNotification({
                    recipient: subject,
                    sender: req.user.id,
                    type: "moderation",
                    report: report._id
                });
            }
        }

        await logAudit(req, {
            actor: req.user.id,
            action: "report.update",
            targetType: "report",
            targetId: report._id,
            meta: { status, targetType: report.targetType, targetId: String(report.targetId) }
        });

        res.json({ report });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid report ID"] });
        }
        return next(error);
    }
};

module.exports = { listReports, getReport, updateReport, loadContext };
