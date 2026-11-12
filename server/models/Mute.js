const mongoose = require("mongoose");

// 6.2: mute is one-directional suppression - the muter stops seeing the
// muted user's feed posts and notifications, but every interaction the
// muted user may already make stays possible (unlike a block).
const muteSchema = new mongoose.Schema(
    {
        muter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        muted: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

muteSchema.index({ muter: 1, muted: 1 }, { unique: true });
muteSchema.index({ muter: 1 });

module.exports = mongoose.model("Mute", muteSchema);
