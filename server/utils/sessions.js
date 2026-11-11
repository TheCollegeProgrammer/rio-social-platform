const crypto = require("crypto");
const Session = require("../models/Session");
const { refreshTtlMs } = require("./tokens");

const GRACE_MS = 30 * 1000;

const sha = (raw) => crypto.createHash("sha256").update(raw).digest("hex");
const newRefresh = () => crypto.randomBytes(32).toString("base64url");

const createSession = async (userId, userAgent) => {
    const refreshRaw = newRefresh();
    const doc = await Session.create({
        userId,
        refreshHash: sha(refreshRaw),
        userAgent: String(userAgent || "").slice(0, 200),
        expiresAt: new Date(Date.now() + refreshTtlMs())
    });
    return { sid: String(doc._id), userId: doc.userId, refreshRaw };
};

// Atomic single-document rotation. Returns:
//   { sid, userId, refreshRaw }  - success
//   { reuseDetected: true }      - superseded token replayed outside grace -> revoked
//   null                         - unknown/expired/revoked token
const rotateSession = async (refreshRaw) => {
    const h = sha(refreshRaw);
    const now = Date.now();

    const fresh = newRefresh();
    const rotated = await Session.findOneAndUpdate(
        { refreshHash: h, revokedAt: null, expiresAt: { $gt: new Date(now) } },
        {
            $set: {
                refreshHash: sha(fresh),
                prevRefreshHash: h,
                lastSeenAt: new Date(now),
                expiresAt: new Date(now + refreshTtlMs())
            }
        },
        { new: true }
    );
    if (rotated) {
        return { sid: String(rotated._id), userId: rotated.userId, refreshRaw: fresh };
    }

    // Concurrent refresh (parallel tabs): the superseded hash may rotate again
    // within the grace window without counting as theft.
    const doc = await Session.findOne({
        prevRefreshHash: h,
        revokedAt: null,
        expiresAt: { $gt: new Date(now) }
    });
    if (doc && now - new Date(doc.updatedAt).getTime() < GRACE_MS) {
        const again = newRefresh();
        const ok = await Session.updateOne(
            { _id: doc._id, prevRefreshHash: h, revokedAt: null },
            {
                $set: {
                    refreshHash: sha(again),
                    lastSeenAt: new Date(now),
                    expiresAt: new Date(now + refreshTtlMs())
                }
            }
        );
        if (ok.matchedCount === 1) {
            return { sid: String(doc._id), userId: doc.userId, refreshRaw: again };
        }
    }

    // Reuse outside the grace window: assume theft, kill the whole session.
    const reused = await Session.findOneAndUpdate(
        { prevRefreshHash: h, revokedAt: null },
        { $set: { revokedAt: new Date(now) } }
    );
    if (reused) return { reuseDetected: true };
    return null;
};

const isSessionActive = async (sid) => {
    if (!sid) return false;
    const found = await Session.exists({
        _id: sid,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
    });
    return Boolean(found);
};

const revokeSession = async (sid) => {
    if (!sid) return;
    await Session.updateOne({ _id: sid, revokedAt: null }, { $set: { revokedAt: new Date() } });
};

const revokeAllForUser = async (userId) => {
    if (!userId) return;
    await Session.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
};

module.exports = {
    createSession,
    rotateSession,
    isSessionActive,
    revokeSession,
    revokeAllForUser
};
