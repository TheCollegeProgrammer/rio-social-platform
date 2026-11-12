import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { getMessages } from "../services/api";

const idOf = (v) => String(v?._id || v || "");

// 5.3/5.4/5.6/5.9: live state for the open conversation — new messages
// (deduped vs the REST append by _id), typing, delivery/read status, and
// a REST re-sync after reconnect. Delivery is only claimed after the
// recipient's own message:delivered ack, never from the server's emit.
export function useChatSocket({ conversationId, currentUserId, setMessages }) {
    const { socket } = useSocket();
    const [peerTyping, setPeerTyping] = useState(false);
    const lastTypingSent = useRef(0);

    const ackDelivered = useCallback(
        (list) => {
            if (!socket || !conversationId || !Array.isArray(list)) return;
            const ids = list
                .filter(
                    (m) =>
                        idOf(m.sender) !== idOf(currentUserId) &&
                        !(m.deliveredTo || []).some((d) => idOf(d) === idOf(currentUserId))
                )
                .map((m) => m._id)
                .filter(Boolean);
            if (ids.length) socket.emit("message:delivered", { conversationId, messageIds: ids });
        },
        [socket, conversationId, currentUserId]
    );

    useEffect(() => {
        if (!socket || !conversationId) return undefined;

        const onNew = ({ conversationId: cid, message }) => {
            if (cid !== conversationId || !message?._id) return;
            setMessages((prev) =>
                prev.some((m) => m._id === message._id) ? prev : [...prev, message]
            );
            if (idOf(message.sender) !== idOf(currentUserId)) {
                socket.emit("message:delivered", { conversationId, messageIds: [message._id] });
            }
        };

        const onUpdate = ({ conversationId: cid, userId, typing }) => {
            if (cid !== conversationId || idOf(userId) === idOf(currentUserId)) return;
            setPeerTyping(!!typing);
        };

        const onStatus = ({ conversationId: cid, userId, status, messageIds }) => {
            if (cid !== conversationId) return;
            setMessages((prev) =>
                prev.map((m) => {
                    if (messageIds && !messageIds.includes(m._id)) return m;
                    if (idOf(m.sender) === idOf(userId)) return m;
                    if (status === "read") {
                        if ((m.readBy || []).some((r) => idOf(r) === idOf(userId))) return m;
                        return { ...m, readBy: [...(m.readBy || []), userId] };
                    }
                    if (status === "delivered") {
                        if ((m.deliveredTo || []).some((d) => idOf(d) === idOf(userId))) return m;
                        return { ...m, deliveredTo: [...(m.deliveredTo || []), userId] };
                    }
                    return m;
                })
            );
        };

        // 5.9: reconnect -> re-sync missed messages from REST (source of truth).
        const onConnect = () => {
            getMessages(conversationId)
                .then((d) => {
                    setMessages(d.messages);
                    ackDelivered(d.messages);
                })
                .catch(() => {});
        };

        socket.on("message:new", onNew);
        socket.on("typing:update", onUpdate);
        socket.on("message:status", onStatus);
        socket.on("connect", onConnect);
        return () => {
            socket.off("message:new", onNew);
            socket.off("typing:update", onUpdate);
            socket.off("message:status", onStatus);
            socket.off("connect", onConnect);
            if (conversationId) socket.emit("typing:stop", { conversationId });
            setPeerTyping(false);
        };
    }, [socket, conversationId, currentUserId, setMessages, ackDelivered]);

    // Client-side throttle on top of the server's rate limit.
    const notifyTyping = () => {
        if (!socket || !conversationId) return;
        const now = Date.now();
        if (now - lastTypingSent.current < 1200) return;
        lastTypingSent.current = now;
        socket.emit("typing:start", { conversationId });
    };

    const stopTyping = () => {
        if (!socket || !conversationId) return;
        lastTypingSent.current = 0;
        socket.emit("typing:stop", { conversationId });
    };

    return { peerTyping, notifyTyping, stopTyping, ackDelivered };
}
