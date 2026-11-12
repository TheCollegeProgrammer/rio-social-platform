const { Server } = require("socket.io");
const { allowedOrigins } = require("../config/origins");
const { authenticate } = require("./auth");
const presence = require("./presence");
const { registerTyping } = require("./typing");

// 5.1/5.2: Socket.IO transport layered beside the existing REST APIs
// (history, initial state and fallback stay on REST). Handshakes must
// pass the same JWT + live-session check as every protected route.
let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true },
        // Events are tiny JSON payloads; cap them so a rogue client
        // cannot push bulk data through the socket channel.
        maxHttpBufferSize: 1e4
    });

    io.use(async (socket, next) => {
        const user = await authenticate(socket.handshake);
        if (!user) return next(new Error("unauthorized"));
        socket.data.user = user;
        next();
    });

    io.on("connection", (socket) => {
        const { id } = socket.data.user;
        const room = `user:${id}`;
        socket.join(room);
        presence.add(id, socket.id);
        // Tell the user's other devices this connection came online.
        socket.to(room).emit("presence:update", { userId: id, online: true });

        // 5.5: reply with current online state for any profile being viewed.
        socket.on("presence:get", ({ userId } = {}) => {
            if (!userId || typeof userId !== "string") return;
            socket.emit("presence:state", { userId, online: presence.isOnline(userId) });
        });

        registerTyping(socket, io);

        socket.on("disconnect", () => {
            // Only broadcast offline when the LAST device disconnects.
            if (presence.remove(id, socket.id)) {
                socket.to(room).emit("presence:update", { userId: id, online: false });
            }
        });
    });

    return io;
};

const getIO = () => io;

// Emit an event to every live socket belonging to one user (all devices).
const emitToUser = (userId, event, payload) => {
    if (io) io.to(`user:${String(userId)}`).emit(event, payload);
};

// Emit to every participant of a conversation (all their devices).
const emitToConversation = (participants, event, payload) => {
    if (!io) return;
    for (const p of participants) io.to(`user:${p}`).emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToConversation };
