const mongoose = require("mongoose");

// P0-05/F-08: durable queue for remote media destruction. Fire-and-forget
// destroys silently leaked orphans whenever Cloudinary was unreachable;
// each job retries with backoff and is dropped only after repeated failure.
const mediaCleanupSchema = new mongoose.Schema(
    {
        url: { type: String, required: true, unique: true },
        attempts: { type: Number, default: 0 },
        nextAttemptAt: { type: Date, default: Date.now },
        lastError: { type: String, default: "" }
    },
    { timestamps: true }
);

mediaCleanupSchema.index({ nextAttemptAt: 1 });

module.exports = mongoose.model("MediaCleanup", mediaCleanupSchema);
