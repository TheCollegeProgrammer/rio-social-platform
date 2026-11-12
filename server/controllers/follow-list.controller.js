const User = require("../models/User");
const { buildPostVisibility } = require("../utils/visibility");
const { blockedByTarget } = require("../utils/socialGraph");

// Shared handler for the followers/following list endpoints: block gate,
// then the F-13 private-account gate, then the populated list.
const makeListHandler = (field) => async (req, res, next) => {
    try {
        if (await blockedByTarget(req.user.id, req.params.id)) {
            return res.status(403).json({ errors: ["This account is unavailable"] });
        }
        const user = await User.findById(req.params.id)
            .select(`${field} isPrivate`)
            .populate(field, "username name avatar bio");

        if (!user) return res.status(404).json({ errors: ["User not found"] });

        // F-13: private accounts hide their social graph from non-followers.
        if (user.isPrivate === true) {
            const vis = await buildPostVisibility(req.user.id);
            if (!vis.canSeeLists(user._id, true)) {
                return res.status(403).json({ errors: ["This account is private"] });
            }
        }

        res.json({ [field]: user[field] });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ errors: ["Invalid user ID"] });
        }
        return next(error);
    }
};

const getFollowers = makeListHandler("followers");
const getFollowing = makeListHandler("following");

module.exports = { getFollowers, getFollowing };
