// 5.5: transient presence — userId -> set of socket ids (multi-device).
// In-memory only; no DB writes per heartbeat. "Online" means "has a live
// socket", never "actively using the app".
const socketsByUser = new Map();

const key = (userId) => String(userId);

const add = (userId, socketId) => {
    const k = key(userId);
    if (!socketsByUser.has(k)) socketsByUser.set(k, new Set());
    socketsByUser.get(k).add(socketId);
};

// Returns true when the user has no remaining sockets (fully offline).
const remove = (userId, socketId) => {
    const k = key(userId);
    const set = socketsByUser.get(k);
    if (!set) return true;
    set.delete(socketId);
    if (set.size === 0) {
        socketsByUser.delete(k);
        return true;
    }
    return false;
};

const isOnline = (userId) => socketsByUser.has(key(userId));
const socketCount = (userId) => (socketsByUser.get(key(userId)) || new Set()).size;

module.exports = { add, remove, isOnline, socketCount };
