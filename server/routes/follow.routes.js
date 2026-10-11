const express = require("express");
const protect = require("../middleware/auth.middleware");
const {
    toggleFollow,
    getFollowers,
    getFollowing
} = require("../controllers/follow.controller");

const router = express.Router();

router.post("/:id/follow", protect, toggleFollow);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);

module.exports = router;
