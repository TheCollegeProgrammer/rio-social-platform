const express = require("express");
const protect = require("../middleware/auth.middleware");
const {
    getConversations,
    getOrCreateConversation,
    getMessages,
    sendMessage
} = require("../controllers/message.controller");

const router = express.Router();

router.get("/", protect, getConversations);
router.get("/user/:userId", protect, getOrCreateConversation);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, sendMessage);

module.exports = router;
