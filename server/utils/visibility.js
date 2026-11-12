const User = require("../models/User");
const { blockedEither } = require("./socialGraph");

// F-13 (isPrivate enforcement): posts of a private account are visible only
// to the author, admins, and confirmed followers; follower/following lists
// follow the same rule. Populated author docs must include `isPrivate`.
const buildPostVisibility = async (viewerId) => {
    const self = viewerId || null;
    let following = new Set();
    let isMod = false;

    if (self) {
        const me = await User.findById(self).select("role following");
        if (me) {
            following = new Set((me.following || []).map(String));
            isMod = me.role === "admin";
        }
    }

    return {
        // post => true when it must be hidden from this viewer
        hidden: (post) => {
            const author = post && post.author;
            if (!author) return false;
            const aid = String(author._id ?? author);
            if (isMod || aid === self) return false;
            // 6.5: per-post followers-only audience
            if (post.visibility === "followers" && !following.has(aid)) return true;
            // account-level private
            if (author.isPrivate !== true) return false;
            return !following.has(aid);
        },
        // gate for the profile owner's follower/following lists
        canSeeLists: (ownerId, ownerIsPrivate) => {
            if (!ownerIsPrivate) return true;
            if (isMod) return true;
            if (self && self === String(ownerId)) return true;
            return following.has(String(ownerId));
        }
    };
};

// 6.3: shared gate for endpoints that address a post by direct URL
// (comments, likes, bookmarks). Mirrors getPostById: private authors need
// the follow relationship and blocks hide the post in both directions, so
// a direct request must look like a 404 - existence itself must not leak.
// `post.author` may be an id or a partially populated doc.
const canViewPost = async (viewerId, post) => {
    if (!post) return false;
    let author = post.author;
    if (author && typeof author.isPrivate !== "boolean") {
        author = await User.findById(author).select("isPrivate");
        if (!author) return false;
    }
    const vis = await buildPostVisibility(viewerId);
    if (vis.hidden({ author, visibility: post.visibility })) return false;
    if (viewerId && await blockedEither(viewerId, author._id)) return false;
    return true;
};

// 6.5: accepted per-post audiences. `undefined`/null means "default";
// anything else must be a supported level or the caller rejects it.
const VISIBILITIES = ["public", "followers"];
const parseVisibility = (value) => {
    if (value === undefined || value === null || value === "") {
        return { ok: true, value: "public" };
    }
    if (VISIBILITIES.includes(value)) return { ok: true, value };
    return { ok: false };
};

module.exports = { buildPostVisibility, canViewPost, parseVisibility };
