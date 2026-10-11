const express = require("express");
const protect = require("../middleware/auth.middleware");
const optionalAuth = require("../middleware/optionalAuth.middleware");
const { getProfile, updateProfile, deleteAccount } = require("../controllers/profile.controller");
const { searchUsers } = require("../controllers/bookmark.controller");

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/:id", optionalAuth, getProfile);
router.put("/", protect, updateProfile);
router.delete("/", protect, deleteAccount);

module.exports = router;
