const express = require("express");
const protect = require("../middleware/auth.middleware");
const {
    getConversations,
    getOrCreateConversation,
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
router.get("/user/:userId", protect, getOrCreateConversation);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, sendMessage);
router.patch("/:id/read", protect, markConversationRead);

module.exports = router;
