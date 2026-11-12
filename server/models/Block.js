const mongoose = require("mongoose");

// 6.1: blocking severs follows/requests and hides both directions' content.
// One doc per (blocker, blocked) pair keeps the relationship duplicate-free.
const blockSchema = new mongoose.Schema(
    {
        blocker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        blocked: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });

module.exports = mongoose.model("Block", blockSchema);
