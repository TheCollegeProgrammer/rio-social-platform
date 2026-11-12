const mongoose = require("mongoose");

// 6.4: private accounts gate follows behind an approval request. One doc per
// (requester, target) pair keeps duplicates impossible; status flips between
// pending/approved/rejected so re-requests after rejection reuse the row.
const followRequestSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        target: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        }
    },
    { timestamps: true }
);

followRequestSchema.index({ requester: 1, target: 1 }, { unique: true });
followRequestSchema.index({ target: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("FollowRequest", followRequestSchema);
