import { useEffect } from "react";
import { getConversations, markConversationRead } from "../services/api";
import { useSocket } from "../context/SocketContext";

// 5.3/5.7/5.9: live inbox — preview + unread from message:new, badge
// zeroing when another of the user's devices marks the chat read, and a
// REST refetch after reconnect so missed events are recovered.
export function useInboxSync({ setConversations, handleRead, activeId, currentUserId }) {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return undefined;

        const onNew = ({ conversationId, message }) => {
            const senderId = message.sender?._id || message.sender;
            const isOwn = String(senderId) === String(currentUserId);
            const isActive = conversationId === activeId;
            if (isActive && !isOwn) {
                markConversationRead(conversationId)
                    .then(() => handleRead(conversationId))
                    .catch(() => {});
            }
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c._id === conversationId);
                if (idx === -1) return prev;
                const target = prev[idx];
                const unread = isActive
                    ? 0
                    : isOwn
                        ? target.unreadCount || 0
                        : (target.unreadCount || 0) + 1;
                const updated = {
                    ...target,
                    lastMessage: { content: message.content, sender: senderId, createdAt: message.createdAt },
                    unreadCount: unread,
                    updatedAt: message.createdAt
                };
                return [updated, ...prev.filter((c) => c._id !== conversationId)];
            });
        };

        const onStatus = ({ conversationId, userId, status }) => {
            if (status === "read" && String(userId) === String(currentUserId)) {
                handleRead(conversationId);
            }
        };

        const onConnect = () => {
            getConversations()
                .then((d) => setConversations(d.conversations))
                .catch(() => {});
        };

        socket.on("message:new", onNew);
        socket.on("message:status", onStatus);
        socket.on("connect", onConnect);
        return () => {
            socket.off("message:new", onNew);
            socket.off("message:status", onStatus);
            socket.off("connect", onConnect);
        };
    }, [socket, activeId, currentUserId, handleRead, setConversations]);
}
