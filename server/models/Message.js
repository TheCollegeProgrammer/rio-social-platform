const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        // 5.6: delivery is recorded only when the recipient's client acks
        // (socket ack or REST fetch) — never from the server's own emit.
        deliveredTo: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
