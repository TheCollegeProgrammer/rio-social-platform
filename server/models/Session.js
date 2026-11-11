const mongoose = require("mongoose");

// Server-side session record. The raw refresh token is NEVER stored - only a
// SHA-256 hash. `prevRefreshHash` enables rotation + reuse detection: a token
// that matches a superseded hash after the grace window means theft -> revoke.
const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        refreshHash: { type: String, required: true, unique: true },
        prevRefreshHash: { type: String, default: null },
        userAgent: { type: String, default: "" },
        lastSeenAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        revokedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

// TTL sweep removes expired sessions (Mongo runs the index ~every 60s).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Session", sessionSchema);
