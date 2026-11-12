const express = require("express");
const protect = require("../middleware/auth.middleware");
const optionalAuth = require("../middleware/optionalAuth.middleware");
const upload = require("../config/upload");
const { pushToCloudinary } = require("../middleware/cloudinary.middleware");
const commentRoutes = require("./comment.routes");
const { createPost, getPostById, getTrendingHashtags } = require("../controllers/post.controller");
const { getPosts } = require("../controllers/feed.controller");
const { editPost, deletePost, toggleLike } = require("../controllers/post-action.controller");
const { toggleBookmark, getBookmarks, searchPosts } = require("../controllers/bookmark.controller");
const { createPostWithImage, removePostImage, addPostImages } = require("../controllers/post-image.controller");
const { togglePin } = require("../controllers/pin.controller");
const { validateImages } = require("../middleware/validateImage");
const {
    likeLimiter,
    bookmarkLimiter,
    uploadLimiter
} = require("../middleware/ratelimit");

const router = express.Router();

router.get("/", optionalAuth, getPosts);
router.get("/search", optionalAuth, searchPosts);
router.get("/trending", optionalAuth, getTrendingHashtags);
router.get("/bookmarks", protect, getBookmarks);
router.post("/", protect, createPost);
router.post("/image", protect, uploadLimiter, upload.array("image", 8), validateImages, pushToCloudinary("posts"), createPostWithImage);
router.get("/:id", optionalAuth, getPostById);
router.put("/:id", protect, editPost);
router.delete("/:id", protect, deletePost);
router.delete("/:id/image", protect, removePostImage);
router.post("/:id/image", protect, uploadLimiter, upload.array("image", 8), validateImages, pushToCloudinary("posts"), addPostImages);
router.post("/:id/like", protect, likeLimiter, toggleLike);
router.post("/:id/bookmark", protect, bookmarkLimiter, toggleBookmark);
router.post("/:id/pin", protect, togglePin);
router.use("/:postId/comments", commentRoutes);

module.exports = router;
