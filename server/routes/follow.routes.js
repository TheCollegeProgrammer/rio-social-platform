const express = require("express");
const protect = require("../middleware/auth.middleware");
const { followLimiter } = require("../middleware/ratelimit");
const { toggleFollow } = require("../controllers/follow.controller");
const { getFollowers, getFollowing } = require("../controllers/follow-list.controller");
const {
    getFollowRequests,
    getSentFollowRequests,
    approveFollowRequest,
    rejectFollowRequest
} = require("../controllers/follow-request.controller");
const { blockUser, unblockUser } = require("../controllers/block.controller");
const { muteUser, unmuteUser } = require("../controllers/mute.controller");
const { getSuggestions } = require("../controllers/suggestion.controller");

const router = express.Router();

router.get("/suggestions", protect, getSuggestions);
// 6.4: static request paths registered before /:id/... so "follow-requests"
// can never be captured as a user id.
router.get("/follow-requests", protect, getFollowRequests);
router.get("/follow-requests/sent", protect, getSentFollowRequests);
router.post("/follow-requests/:id/approve", protect, followLimiter, approveFollowRequest);
router.post("/follow-requests/:id/reject", protect, followLimiter, rejectFollowRequest);
// 6.1/6.2: block and mute toggles (static paths stay above /:id/...).
router.post("/:id/block", protect, followLimiter, blockUser);
router.delete("/:id/block", protect, followLimiter, unblockUser);
router.post("/:id/mute", protect, followLimiter, muteUser);
router.delete("/:id/mute", protect, followLimiter, unmuteUser);
router.post("/:id/follow", protect, followLimiter, toggleFollow);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);

module.exports = router;
