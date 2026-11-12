const express = require("express");
const protect = require("../middleware/auth.middleware");
const upload = require("../config/upload");
const { pushToCloudinary } = require("../middleware/cloudinary.middleware");
const { validateImages } = require("../middleware/validateImage");
const { uploadLimiter } = require("../middleware/ratelimit");
const {
    createStory,
    listStories,
    getUserStories,
    getStory,
    viewStory,
    deleteStory
} = require("../controllers/story.controller");

const router = express.Router();

// 7.8: authenticated-only stories; every read enforces expiry server-side.
router.use(protect);
router.get("/", listStories);
router.post(
    "/",
    uploadLimiter,
    upload.single("image"),
    validateImages,
    pushToCloudinary("stories"),
    createStory
);
router.get("/user/:userId", getUserStories);
router.get("/:id", getStory);
router.post("/:id/view", viewStory);
router.delete("/:id", deleteStory);

module.exports = router;
