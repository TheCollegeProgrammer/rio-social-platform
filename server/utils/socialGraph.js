const Block = require("../models/Block");

// True when either user has blocked the other. Blocks are symmetric for
// interaction checks: neither side may follow/like/comment/message.
const blockedEither = async (a, b) => {
    if (!a || !b || String(a) === String(b)) return false;
    const doc = await Block.findOne({
        $or: [{ blocker: a, blocked: b }, { blocker: b, blocked: a }]
    }).select("_id");
    return !!doc;
};

// True when the TARGET has blocked the viewer (viewer is the victim).
// Profile gating uses this asymmetry: blockers may still open the profiles
// they blocked so they can unblock them.
const blockedByTarget = async (viewerId, targetId) => {
    if (!viewerId || !targetId) return false;
    return !!(await Block.findOne({ blocker: targetId, blocked: viewerId }).select("_id"));
};

// Every user id that must disappear from viewerId's surfaces (either
// direction). Anonymous viewers get an empty list.
const blockedIdsFor = async (viewerId) => {
    if (!viewerId) return [];
    const docs = await Block.find({
        $or: [{ blocker: viewerId }, { blocked: viewerId }]
    }).select("blocker blocked");
    const ids = new Set();
    for (const d of docs) {
        const other = String(d.blocker) === String(viewerId)
            ? String(d.blocked)
            : String(d.blocker);
        ids.add(other);
    }
    return [...ids];
};

module.exports = { blockedEither, blockedByTarget, blockedIdsFor };
