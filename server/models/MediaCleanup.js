const mongoose = require("mongoose");

// P0-05/F-08: durable queue for remote media destruction. Fire-and-forget
// destroys silently leaked orphans whenever Cloudinary was unreachable;
// each job retries with backoff and is marked `exhausted` (7.10) after
// repeated failure - the record is kept as an audit trail and can be
// requeued by reconcile-media.js --retry-destroy.
const mediaCleanupSchema = new mongoose.Schema(
    {
        url: { type: String, required: true, unique: true },
        attempts: { type: Number, default: 0 },
        nextAttemptAt: { type: Date, default: Date.now },
        lastError: { type: String, default: "" },
        exhausted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

mediaCleanupSchema.index({ nextAttemptAt: 1 });

module.exports = mongoose.model("MediaCleanup", mediaCleanupSchema);
