const Conversation = require("../models/Conversation");
const { blockedEither } = require("../utils/socialGraph");

// 5.4: ephemeral typing signals — never persisted, rate-limited per
// user+conversation, and auto-cleared server-side if the client never
// sends typing:stop. Membership is re-checked on every event (5.2
// server-side authorization), so outsiders cannot signal into a chat.
const CLEAR_MS = 5000;
const RATE_MS = 1500;
const timers = new Map();
const lastBroadcast = new Map();

const emitTyping = (io, convo, userId, typing) => {
    for (const p of convo.participants) {
        io.to(`user:${p}`).emit("typing:update", {
            conversationId: String(convo._id),
            userId: String(userId),
            typing
        });
    }
};

const findOwned = async (conversationId, userId) => {
    if (!conversationId || typeof conversationId !== "string") return null;
    const convo = await Conversation.findById(conversationId).select("participants");
    if (!convo || !convo.participants.some((p) => p.toString() === userId)) return null;
    // 6.1: blocked pairs may not signal typing into a shared thread either.
    const other = convo.participants.find((p) => p.toString() !== userId);
    if (other && await blockedEither(userId, other.toString())) return null;
    return convo;
};

const scheduleClear = (io, convo, userId) => {
    const key = `${convo._id}:${userId}`;
    const prev = timers.get(key);
    if (prev) clearTimeout(prev);
    timers.set(
        key,
        setTimeout(() => {
            timers.delete(key);
            lastBroadcast.delete(key);
            emitTyping(io, convo, userId, false);
        }, CLEAR_MS)
    );
};

const registerTyping = (socket, io) => {
    socket.on("typing:start", async ({ conversationId } = {}) => {
        try {
            const userId = socket.data.user.id;
            const convo = await findOwned(conversationId, userId);
            if (!convo) return;
            const key = `${convo._id}:${userId}`;
            scheduleClear(io, convo, userId);
            const now = Date.now();
            if (now - (lastBroadcast.get(key) || 0) < RATE_MS) return;
            lastBroadcast.set(key, now);
            emitTyping(io, convo, userId, true);
        } catch {
            // CastError / transient lookup failure: drop the signal.
        }
    });

    socket.on("typing:stop", async ({ conversationId } = {}) => {
        try {
            const userId = socket.data.user.id;
            const key = `${conversationId}:${userId}`;
            const timer = timers.get(key);
            if (timer) clearTimeout(timer);
            timers.delete(key);
            lastBroadcast.delete(key);
            const convo = await findOwned(conversationId, userId);
            if (!convo) return;
            emitTyping(io, convo, userId, false);
        } catch {
            // Same drop-on-error policy as typing:start.
        }
    });
};

module.exports = { registerTyping };
