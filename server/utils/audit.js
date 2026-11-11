const AuditLog = require("../models/AuditLog");

// Best-effort by design: audit failures must never break the action itself,
// but they do surface in server logs so gaps are visible.
const logAudit = async (req, { actor, action, targetType, targetId, meta }) => {
    try {
        await AuditLog.create({
            actor,
            action,
            targetType,
            targetId,
            meta: meta || {},
            ip: String((req && req.ip) || "").slice(0, 64)
        });
    } catch (error) {
        console.error("[audit] failed to record", action, error.message);
    }
};

module.exports = { logAudit };
