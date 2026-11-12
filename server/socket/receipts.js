const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// 5.6: delivery = recipient's client confirmed receipt (socket ack).
// Never treat the server's own emission as proof of delivery. $addToSet
// keeps retries idempotent; membership is re-checked per event (5.2).
const statusTo = (io, participants, payload) => {
    for (const p of participants) io.to(`user:${p}`).emit("message:status", payload);
};

const registerReceipts = (socket, io) => {
    socket.on("message:delivered", async ({ conversationId, messageIds } = {}) => {
        try {
            if (!conversationId || typeof conversationId !== "string") return;
            if (!Array.isArray(messageIds) || messageIds.length === 0 || messageIds.length > 100) return;
            const ids = messageIds.filter((id) => typeof id === "string");
            if (!ids.length) return;

            const userId = socket.data.user.id;
            const convo = await Conversation.findById(conversationId).select("participants");
            if (!convo || !convo.participants.some((p) => p.toString() === userId)) return;

            // Filter to messages that still lack this delivery so matchedCount
            // is meaningful (timestamps would bump updatedAt on every matched
            // doc, making modifiedCount useless as a duplicate guard).
            const result = await Message.updateMany(
                {
                    _id: { $in: ids },
                    conversation: convo._id,
                    sender: { $ne: userId },
                    deliveredTo: { $ne: userId }
                },
                { $addToSet: { deliveredTo: userId } }
            );
            // Already delivered (retry) -> skip the duplicate broadcast.
            if (!result.matchedCount) return;

            statusTo(io, convo.participants, {
                conversationId: String(convo._id),
                userId,
                status: "delivered",
                messageIds: ids
            });
        } catch {
            // CastError / transient lookup failure: drop the ack.
        }
    });
};

module.exports = { registerReceipts };
