import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getConversations, mediaUrl } from "../../services/api";
import { shortTime } from "../../lib/time";
import "./SideCards.css";
import "./MessagesCard.css";

const POLL_MS = 45000;

function MessagesCard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [convos, setConvos] = useState(null);
    const [error, setError] = useState("");
    const busy = useRef(false);

    // Visibility-aware, non-overlapping poll (paused on hidden tab).
    const load = useCallback(async () => {
        if (busy.current || document.hidden) return;
        busy.current = true;
        try {
            const d = await getConversations();
            setConvos((d.conversations || []).slice(0, 4));
            setError("");
        } catch (e) {
            setError(e.message);
        } finally {
            busy.current = false;
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        const vis = () => { if (!document.hidden) load(); };
        document.addEventListener("visibilitychange", vis);
        return () => {
            clearInterval(t);
            document.removeEventListener("visibilitychange", vis);
        };
    }, [load]);

    const open = (c) => navigate("/messages", { state: { conversationId: c._id } });

    const otherOf = (c) =>
        (c.participants || []).find((p) => p._id !== user?._id) || c.participants?.[0];

    return (
        <section className="side-card" aria-labelledby="msg-title">
            <div className="side-head">
                <h2 id="msg-title" className="side-title">Messages</h2>
                <Link to="/messages" className="side-link side-link-inline">See all</Link>
            </div>
            {convos === null && !error && (
                <div className="sk-side-list" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="sk-side">
                            <span className="sk-circle" />
                            <span className="sk-lines"><span className="sk-bar" /><span className="sk-bar" /></span>
                        </div>
                    ))}
                </div>
            )}
            {error && (
                <div className="side-error">
                    <p>{error}</p>
                    <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
                </div>
            )}
            {convos && convos.length === 0 && (
                <p className="side-muted">No conversations yet.</p>
            )}
            {convos && convos.length > 0 && (
                <ul className="mini-inbox">
                    {convos.map((c) => {
                        const other = otherOf(c);
                        const mine = user?._id && String(c.lastMessage?.sender) === String(user._id);
                        const preview = c.lastMessage
                            ? `${mine ? "You: " : ""}${c.lastMessage.content}`
                            : "Start the conversation";
                        const unread = c.unreadCount || 0;
                        const src = other ? mediaUrl(other.avatar) : null;
                        return (
                            <li key={c._id}>
                                <button
                                    className={`inbox-row${unread ? " unread" : ""}`}
                                    onClick={() => open(c)}
                                    aria-label={`Open conversation with ${other?.name || "user"}${unread ? `, ${unread} unread` : ""}`}
                                >
                                    <span className="inbox-avatar">
                                        {src ? <img src={src} alt="" /> : other?.name?.charAt(0)?.toUpperCase() || "?"}
                                    </span>
                                    <span className="inbox-text">
                                        <span className="inbox-top">
                                            <strong>{other?.name || "Conversation"}</strong>
                                            <small>{shortTime(c.lastMessage?.createdAt || c.updatedAt)}</small>
                                        </span>
                                        <span className="inbox-preview">{preview}</span>
                                    </span>
                                    {unread > 0 && <span className="inbox-unread">{unread > 9 ? "9+" : unread}</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <Link to="/messages" className="side-cta">Open Messages</Link>
        </section>
    );
}

export default MessagesCard;
