const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { revokeAllForUser } = require("../utils/sessions");
const { logAudit } = require("../utils/audit");

const suspendUser = async (req, res, next) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ errors: ["User not found"] });
        if (target.role === "admin") {
            return res.status(400).json({ errors: ["Admins cannot be suspended"] });
        }
        if (target.isSuspended) {
            return res.status(400).json({ errors: ["User is already suspended"] });
        }

        target.isSuspended = true;
        await target.save();
        // Kill every live session immediately - suspension has to bite even
        // for an already-authenticated client (protect rejects revoked sids).
        await revokeAllForUser(target._id);
        await logAudit(req, {
            actor: req.user.id,
            action: "user.suspend",
            targetType: "user",
            targetId: target._id,
            meta: { reason: String(req.body?.reason || "").slice(0, 300) }
        });

        res.json({ message: "User suspended", userId: target._id });
    } catch (error) {
        return next(error);
    }
};

const restoreUser = async (req, res, next) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ errors: ["User not found"] });
        if (!target.isSuspended) {
            return res.status(400).json({ errors: ["User is not suspended"] });
        }

        target.isSuspended = false;
        await target.save();
        await logAudit(req, {
            actor: req.user.id,
            action: "user.restore",
            targetType: "user",
            targetId: target._id
        });

        res.json({ message: "User restored", userId: target._id });
    } catch (error) {
        return next(error);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
        const logs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("actor", "username");
        res.json({ logs });
    } catch (error) {
        return next(error);
    }
};

module.exports = { suspendUser, restoreUser, getAuditLogs };
