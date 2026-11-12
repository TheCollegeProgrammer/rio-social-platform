import { io } from "socket.io-client";
import { API_ORIGIN } from "../services/http";

// 5.1: single shared socket pointed at the same origin as REST. Auth
// rides the httpOnly session cookie (withCredentials); reconnect with
// bounded backoff is Socket.IO's built-in behavior (5.9).
let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(API_ORIGIN, {
            withCredentials: true,
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 8000,
            timeout: 8000
        });
    }
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
};

export const disconnectSocket = () => {
    if (socket) socket.disconnect();
};
