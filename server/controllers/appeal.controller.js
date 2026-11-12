const Appeal = require("../models/Appeal");
const Report = require("../models/Report");
const { loadContext } = require("./report-admin.controller");
const { createNotification } = require("./notification.controller");
const { logAudit } = require("../utils/audit");

const APPEAL_STATUSES = ["pending", "approved", "denied"];

// 6.8: only the affected user (report subject) may challenge a decision.
const subjectId = async (report) => {
    const context = await loadContext(report);
    if (!context) return null;
    return context.kind === "user" ? String(context._id) : String(context.author?._id || "");
};

const createAppeal = async (req, res, next) => {
    try {
        const reason = String(req.body?.reason || "").trim();
        if (!reason) return res.status(400).json({ errors: ["A reason is required"] });
        const { reportId } = req.body || {};
        if (!reportId) return res.status(400).json({ errors: ["Report is required"] });
        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ errors: ["Report not found"] });
        if (report.status !== "resolved") {
            return res.status(400).json({ errors: ["Only resolved decisions can be appealed"] });
        }
        const subject = await subjectId(report);
        if (!subject) return res.status(404).json({ errors: ["Decision target no longer exists"] });
        if (subject !== req.user.id) {
            return res.status(403).json({ errors: ["Only the affected user can appeal this decision"] });
        }
        const dup = await Appeal.exists({ appellant: req.user.id, report: report._id });
        if (dup) return res.status(409).json({ errors: ["You already appealed this decision"] });

        const appeal = await Appeal.create({
            appellant: req.user.id,
            report: report._id,
            reason: reason.slice(0, 500)
        });
        res.status(201).json({ appeal });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ errors: ["You already appealed this decision"] });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid report ID"] });
        }
        return next(error);
    }
};

const myAppeals = async (req, res, next) => {
    try {
        const appeals = await Appeal.find({ appellant: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate({ path: "report", select: "status resolution targetType" });
        res.json({ appeals });
    } catch (error) {
        return next(error);
    }
};

const listAppeals = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const filter = {};
        if (req.query.status) {
            if (!APPEAL_STATUSES.includes(req.query.status)) {
                return res.status(400).json({ errors: ["Unknown status filter"] });
            }
            filter.status = req.query.status;
        }

        const [appeals, total] = await Promise.all([
            Appeal.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("appellant", "username name avatar")
                .populate({ path: "report", select: "status resolution targetType" }),
            Appeal.countDocuments(filter)
        ]);

        res.json({ appeals, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        return next(error);
    }
};

// Approved challenges push the original decision back into review.
const decideAppeal = async (req, res, next) => {
    try {
        const { status, decisionNote } = req.body || {};
        if (!["approved", "denied"].includes(status)) {
            return res.status(400).json({ errors: ["Status must be approved or denied"] });
        }
        const appeal = await Appeal.findById(req.params.id);
        if (!appeal) return res.status(404).json({ errors: ["Appeal not found"] });
        if (appeal.status !== "pending") {
            return res.status(409).json({ errors: ["This appeal was already decided"] });
        }

        appeal.status = status;
        appeal.decisionNote = String(decisionNote || "").slice(0, 500);
        appeal.decidedBy = req.user.id;
        appeal.decidedAt = new Date();
        await appeal.save();

        if (status === "approved") {
            await Report.updateOne({ _id: appeal.report }, { $set: { status: "reviewing" } });
        }

        await createNotification({
            recipient: appeal.appellant,
            sender: req.user.id,
            type: status === "approved" ? "appeal_approved" : "appeal_denied",
            report: appeal.report
        });

        await logAudit(req, {
            actor: req.user.id,
            action: "appeal.decide",
            targetType: "appeal",
            targetId: appeal._id,
            meta: { status, reportId: String(appeal.report) }
        });

        await appeal.populate({ path: "report", select: "status resolution targetType" });
        res.json({ appeal });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid appeal ID"] });
        }
        return next(error);
    }
};

module.exports = { createAppeal, myAppeals, listAppeals, decideAppeal };
