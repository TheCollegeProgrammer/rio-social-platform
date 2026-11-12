import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

// 5.3/5.4: live message + typing state for the one open conversation.
// Socket echoes of our own REST send are deduped by _id, and typing
// signals for other conversations (or our own user) are ignored.
export function useChatSocket({ conversationId, currentUserId, setMessages }) {
    const { socket } = useSocket();
    const [peerTyping, setPeerTyping] = useState(false);
    const lastTypingSent = useRef(0);

    useEffect(() => {
        if (!socket || !conversationId) return undefined;

        const onNew = ({ conversationId: cid, message }) => {
            if (cid !== conversationId || !message?._id) return;
            setMessages((prev) =>
                prev.some((m) => m._id === message._id) ? prev : [...prev, message]
            );
        };
        const onUpdate = ({ conversationId: cid, userId, typing }) => {
            if (cid !== conversationId || userId === currentUserId) return;
            setPeerTyping(!!typing);
        };

        socket.on("message:new", onNew);
        socket.on("typing:update", onUpdate);
        return () => {
            socket.off("message:new", onNew);
            socket.off("typing:update", onUpdate);
            if (conversationId) socket.emit("typing:stop", { conversationId });
            setPeerTyping(false);
        };
    }, [socket, conversationId, currentUserId, setMessages]);

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

    return { peerTyping, notifyTyping, stopTyping };
}
