const mongoose = require("mongoose");

// 7.8: ephemeral stories (24h by default). `expiresAt` is computed from
// SERVER time at creation and every read filters on it - the UI never
// decides visibility. A TTL index backstops document removal (~60s poll)
// while the tray endpoint lazily deletes expired docs + their media so
// files don't linger until the TTL wakes up.
const storySchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        media: { type: String, required: true },
        visibility: { type: String, enum: ["public", "followers"], default: "public" },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
        views: {
            type: [
                {
                    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                    viewedAt: Date
                }
            ],
            default: []
        }
    },
    { timestamps: true }
);

storySchema.index({ author: 1, expiresAt: -1 });

module.exports = mongoose.model("Story", storySchema);
