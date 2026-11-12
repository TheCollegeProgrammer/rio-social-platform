const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["like", "comment", "follow", "reply", "follow_request", "follow_approved", "follow_rejected", "mention", "moderation", "appeal_approved", "appeal_denied"],
            required: true
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        },
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        },
        report: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report"
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
