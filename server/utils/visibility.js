const User = require("../models/User");

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
            if (!author || author.isPrivate !== true) return false;
            const aid = String(author._id ?? author);
            if (isMod || aid === self) return false;
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

module.exports = { buildPostVisibility };
