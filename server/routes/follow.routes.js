const express = require("express");
const protect = require("../middleware/auth.middleware");
const { followLimiter } = require("../middleware/ratelimit");
const {
    toggleFollow,
    getFollowers,
    getFollowing
} = require("../controllers/follow.controller");
const { getSuggestions } = require("../controllers/suggestion.controller");

const router = express.Router();

router.get("/suggestions", protect, getSuggestions);
router.post("/:id/follow", protect, followLimiter, toggleFollow);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);

module.exports = router;
