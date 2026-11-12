const mongoose = require("mongoose");

// P0-07: append-only record of privileged actions (suspend/restore/delete,
// moderator content removal). Never holds passwords/tokens/emails bodies.
const auditSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        action: { type: String, required: true, index: true },
        targetType: {
            type: String,
            enum: ["user", "post", "comment", "session", "report"],
            default: ""
        },
        targetId: { type: mongoose.Schema.Types.ObjectId },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
        ip: { type: String, default: "" }
    },
    { timestamps: true }
);

auditSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditSchema);
