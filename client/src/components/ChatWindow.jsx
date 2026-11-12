import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Send, Mail } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getMessages, sendMessage, markConversationRead } from "../services/api";
import { useChatSocket } from "../lib/useChatSocket";
import { messageStatus } from "../lib/messageStatus";
import Avatar from "./Avatar";
import "../pages/MessagesChat.css";

function ChatWindow({ conversation, onBack, onRead }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loadedFor, setLoadedFor] = useState(null);
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const { peerTyping, notifyTyping, stopTyping, ackDelivered } = useChatSocket({
        conversationId: conversation?._id,
        currentUserId: user?._id,
        setMessages
    });

    const other = conversation?.participants?.find((p) => p._id !== user?._id);
    const loading = !!conversation?._id && loadedFor !== conversation._id;

    useEffect(() => {
        if (!conversation?._id) return;
        let cancelled = false;
        getMessages(conversation._id)
            .then((d) => {
                if (cancelled) return;
                setMessages(d.messages);
                setLoadedFor(conversation._id);
                ackDelivered(d.messages);
            })
            .catch((e) => { if (!cancelled) setError(e.message); });
        // Opening the chat marks it read
        if (conversation.unreadCount > 0) {
            markConversationRead(conversation._id)
                .then(() => onRead?.(conversation._id))
                .catch(() => { });
        }
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?._id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, peerTyping]);

    const submit = async (e) => {
        e.preventDefault();
        if (!text.trim() || sending) return;
        try {
            setSending(true);
            setError("");
            const msg = await sendMessage(conversation._id, text.trim());
            setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
            setText("");
            stopTyping();
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    if (!conversation) {
        return (
            <div className="chat-empty empty-state">
                <div className="empty-icon"><Mail size={44} strokeWidth={1.3} /></div>
                <p>Select a conversation</p>
            </div>
        );
    }

    return (
        <div className="chat-window">
            <header className="chat-header">
                <button className="btn btn-ghost btn-sm chat-back" onClick={onBack}>
                    <ArrowLeft size={16} />
                </button>
                <Avatar user={other} size={36} />
                <div>
                    <h3>{other?.name}</h3>
                    <span className="faint">@{other?.username}</span>
                </div>
            </header>

            <div className="chat-messages">
                {loading ? (
                    <p className="muted">Loading messages...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : messages.length === 0 ? (
                    <div className="empty-state">
                        <p>No messages yet — say hello!</p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const mine = m.sender?._id === user?._id;
                        return (
                            <div key={m._id} className={`bubble-row ${mine ? "mine" : ""}`}>
                                <div className="bubble">
                                    {m.content}
                                    {mine && (
                                        <span className="bubble-status">{messageStatus(m, other?._id)}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {peerTyping && (
                <p className="typing-indicator">{other?.name || "Someone"} is typing…</p>
            )}

            <form className="chat-input" onSubmit={submit}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    maxLength={2000}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (e.target.value) notifyTyping();
                        else stopTyping();
                    }}
                />
                <button type="submit" className="btn btn-sm" disabled={sending || !text.trim()}>
                    {sending ? "..." : <><Send size={14} /> Send</>}
                </button>
            </form>
        </div>
    );
}

export default ChatWindow;
