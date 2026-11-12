const mongoose = require("mongoose");

// 6.7: user-generated moderation intake. One open thread per reporter and
// target; resolved/dismissed reports may be filed again later.
const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        targetType: {
            type: String,
            enum: ["post", "comment", "user"],
            required: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        status: {
            type: String,
            enum: ["open", "reviewing", "resolved", "dismissed"],
            default: "open",
            index: true
        },
        resolution: {
            type: String,
            default: "",
            maxlength: 500
        },
        handledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        handledAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
