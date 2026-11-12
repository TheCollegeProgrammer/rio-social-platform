const User = require("../models/User");
const { blockedIdsFor } = require("../utils/socialGraph");

const DAY_MS = 86400000;
const MAX_LIMIT = 10;
const MAX_OFFSET = 100;
const MUTUAL_SEEDS = 20;
const PROFILE_FIELDS = "username name avatar bio isPrivate followers createdAt";

// Real computed fields only: mutualCount from actual shared follows,
// isNew from account age. No invented popularity or activity status.
const toPublic = (u, mySet) => {
    let mutualCount = 0;
    for (const f of u.followers) if (mySet.has(String(f))) mutualCount += 1;
    const age = Date.now() - new Date(u.createdAt).getTime();
    return {
        _id: u._id,
        username: u.username,
        name: u.name,
        avatar: u.avatar,
        bio: u.bio,
        isPrivate: u.isPrivate,
        followersCount: u.followers.length,
        mutualCount,
        isNew: age < 14 * DAY_MS
    };
};

const getSuggestions = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), MAX_LIMIT);
        const offset = Math.min(Math.max(parseInt(req.query.offset) || 0, 0), MAX_OFFSET);

        const me = await User.findById(req.user.id).select("following");
        const following = (me?.following || []).map(String);
        // 6.1: blocked accounts are never suggested in either direction.
        const blocked = await blockedIdsFor(req.user.id);
        const exclude = new Set([...following, req.user.id, ...blocked]);
        const mySet = new Set(following);

        // Bucket 1 — mutual connections: discovered via the first
        // MUTUAL_SEEDS accounts I follow (indexed $in, bounded result).
        let ranked = [];
        if (following.length) {
            const pool = await User.find({
                _id: { $nin: [...exclude] },
                isSuspended: { $ne: true },
                followers: { $in: following.slice(0, MUTUAL_SEEDS) }
            })
                .select(PROFILE_FIELDS)
                .limit(40);
            ranked = pool
                .map((u) => ({
                    u,
                    mutual: u.followers.reduce((n, f) => n + (mySet.has(String(f)) ? 1 : 0), 0)
                }))
                .sort((a, b) => b.mutual - a.mutual)
                .map((x) => x.u);
        }

        const seen = new Set(ranked.map((u) => String(u._id)));

        // Bucket 2 — recently joined eligible accounts: createdAt is the
        // only reliable recency signal available (no activity tracking).
        const recent = await User.find({
            _id: { $nin: [...exclude, ...seen] },
            isSuspended: { $ne: true }
        })
            .select(PROFILE_FIELDS)
            .sort({ createdAt: -1 })
            .limit(offset + limit + 5);

        const combined = [...ranked, ...recent];
        const pageUsers = combined.slice(offset, offset + limit);

        res.json({
            users: pageUsers.map((u) => toPublic(u, mySet)),
            hasMore: combined.length > offset + limit
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = { getSuggestions };
