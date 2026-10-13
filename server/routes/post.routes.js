const express = require("express");
const protect = require("../middleware/auth.middleware");
const optionalAuth = require("../middleware/optionalAuth.middleware");
const upload = require("../config/upload");
const commentRoutes = require("./comment.routes");
const { createPost, getPostById, getPosts } = require("../controllers/post.controller");
const { editPost, deletePost, toggleLike } = require("../controllers/post-action.controller");
const { toggleBookmark, getBookmarks, searchPosts } = require("../controllers/bookmark.controller");
const { createPostWithImage, removePostImage, replacePostImage } = require("../controllers/post-image.controller");

const router = express.Router();

router.get("/", optionalAuth, getPosts);
router.get("/search", optionalAuth, searchPosts);
router.get("/bookmarks", protect, getBookmarks);
router.post("/", protect, createPost);
router.post("/image", protect, upload.single("image"), createPostWithImage);
router.get("/:id", optionalAuth, getPostById);
router.put("/:id", protect, editPost);
router.delete("/:id", protect, deletePost);
router.delete("/:id/image", protect, removePostImage);
router.post("/:id/image", protect, upload.single("image"), replacePostImage);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/bookmark", protect, toggleBookmark);
router.use("/:postId/comments", commentRoutes);

module.exports = router;
