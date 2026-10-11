const express = require("express");
const protect = require("../middleware/auth.middleware");
const optionalAuth = require("../middleware/optionalAuth.middleware");
const { createComment, getComments } = require("../controllers/comment.controller");
const {
    editComment,
    deleteComment,
    toggleCommentLike
} = require("../controllers/comment-action.controller");

const router = express.Router({ mergeParams: true });

router.get("/", optionalAuth, getComments);
router.post("/", protect, createComment);
router.put("/:id", protect, editComment);
router.delete("/:id", protect, deleteComment);
router.post("/:id/like", protect, toggleCommentLike);

module.exports = router;
