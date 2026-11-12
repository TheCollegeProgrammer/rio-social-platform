import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/SocketContext";
import { getConversations, getOrCreateConversation, markConversationRead } from "../services/api";
import ConversationList from "../components/ConversationList";
import NewConversationPicker from "../components/NewConversationPicker";
import ChatWindow from "../components/ChatWindow";
import "./Messages.css";
import "./MessagesHeight.css";

function Messages() {
    const { user } = useAuth();
    const location = useLocation();
    const { socket } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [active, setActive] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [mobileChat, setMobileChat] = useState(false);
    const [picker, setPicker] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getConversations()
            .then((d) => {
                if (cancelled) return;
                setConversations(d.conversations);
                const wanted = location.state?.conversationId;
                if (wanted) {
                    const found = d.conversations.find((c) => c._id === wanted);
                    if (found) {
                        setActive(found);
                        setMobileChat(true);
                    }
                }
            })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [location.state]);

    const select = (convo) => {
        setActive(convo);
        setMobileChat(true);
    };

    const handleRead = useCallback((convoId) => {
        setConversations((prev) =>
            prev.map((c) => (c._id === convoId ? { ...c, unreadCount: 0 } : c))
        );
        setActive((prev) => (prev && prev._id === convoId ? { ...prev, unreadCount: 0 } : prev));
    }, []);

    // 5.3: live inbox — preview/unread update on socket push; messages
    // arriving while the chat is open are marked read immediately.
    useEffect(() => {
        if (!socket) return undefined;
        const onNew = ({ conversationId, message }) => {
            const senderId = message.sender?._id || message.sender;
            const isOwn = String(senderId) === String(user?._id);
            const isActive = active?._id === conversationId;
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
        socket.on("message:new", onNew);
        return () => socket.off("message:new", onNew);
    }, [socket, active?._id, user?._id, handleRead]);

    const startConversation = async (u) => {
        const d = await getOrCreateConversation(u._id);
        const convo = d.conversation;
        setConversations((prev) =>
            prev.some((c) => c._id === convo._id) ? prev : [convo, ...prev]
        );
        setActive(convo);
        setPicker(false);
        setMobileChat(true);
    };

    return (
        <div className="page page-wide page-messages">
            <div className="page-header">
                <h1>Messages</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className={`messenger ${mobileChat ? "show-chat" : ""}`}>
                <aside className="convo-panel">
                    <div className="panel-head">
                        <h2 className="panel-title">Conversations</h2>
                        <button
                            className="btn btn-sm new-chat-btn"
                            onClick={() => setPicker((v) => !v)}
                            title="Start a new conversation"
                        >
                            <MessageSquarePlus size={15} />
                            New
                        </button>
                    </div>
                    {picker ? (
                        <NewConversationPicker onStart={startConversation} onCancel={() => setPicker(false)} />
                    ) : loading ? (
                        <p className="muted">Loading...</p>
                    ) : (
                        <ConversationList
                            conversations={conversations}
                            activeId={active?._id}
                            currentUserId={user?._id}
                            onSelect={select}
                        />
                    )}
                </aside>

                <section className="chat-panel">
                    <ChatWindow
                        conversation={active}
                        onBack={() => setMobileChat(false)}
                        onRead={handleRead}
                    />
                </section>
            </div>
        </div>
    );
}

export default Messages;
