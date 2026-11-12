const mongoose = require("mongoose");

// 6.8: a challenge against a resolved moderation decision (report disposition).
// One appeal ever per (appellant, report) pair - duplicates are rejected.
const appealSchema = new mongoose.Schema(
    {
        appellant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        report: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            required: true
        },
        reason: { type: String, required: true, trim: true, maxlength: 500 },
        status: {
            type: String,
            enum: ["pending", "approved", "denied"],
            default: "pending"
        },
        decisionNote: { type: String, default: "", maxlength: 500 },
        decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        decidedAt: { type: Date }
    },
    { timestamps: true }
);

appealSchema.index({ appellant: 1, report: 1 }, { unique: true });
appealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Appeal", appealSchema);
