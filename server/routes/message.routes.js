const express = require("express");
const protect = require("../middleware/auth.middleware");
const { messageLimiter } = require("../middleware/ratelimit");
const {
    getConversations,
    getOrCreateConversation,
    findConversation,
    getMessages,
    sendMessage
} = require("../controllers/message.controller");
const {
    markConversationRead,
    getUnreadCount
} = require("../controllers/message-read.controller");
const { getNewChatUsers } = require("../controllers/message-users.controller");

const router = express.Router();

router.get("/", protect, getConversations);
router.get("/unread-count", protect, getUnreadCount);
router.get("/new-users", protect, getNewChatUsers);
// F-12: creation is a POST; GET is find-only.
router.get("/user/:userId", protect, findConversation);
router.post("/user/:userId", protect, messageLimiter, getOrCreateConversation);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, messageLimiter, sendMessage);
router.patch("/:id/read", protect, markConversationRead);

module.exports = router;
