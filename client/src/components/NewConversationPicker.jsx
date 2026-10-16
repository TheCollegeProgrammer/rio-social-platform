import { useEffect, useState } from "react";
import { Search, MessageCircle, UserRound } from "lucide-react";
import { getNewChatUsers } from "../services/api";
import Avatar from "./Avatar";

function NewConversationPicker({ onStart, onCancel }) {
    const [q, setQ] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const t = setTimeout(() => {
            getNewChatUsers(q)
                .then((d) => { if (!cancelled) { setUsers(d.users); setError(""); } })
                .catch((e) => { if (!cancelled) setError(e.message); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [q]);

    const start = async (u) => {
        setBusy(u._id);
        try {
            await onStart(u);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="new-conv">
            <div className="new-conv-search">
                <Search size={15} />
                <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search people not in your chats..."
                />
            </div>

            {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p className="muted">Searching...</p>
            ) : users.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><UserRound size={40} strokeWidth={1.3} /></div>
                    <p>No new people found</p>
                </div>
            ) : (
                <div className="convo-list">
                    {users.map((u) => (
                        <button
                            key={u._id}
                            className="convo-item"
                            disabled={busy === u._id}
                            onClick={() => start(u)}
                        >
                            <Avatar user={u} />
                            <div className="convo-info">
                                <div className="convo-top">
                                    <span className="convo-name">{u.name}</span>
                                </div>
                                <div className="convo-bottom">
                                    <span className="convo-preview">@{u.username}</span>
                                </div>
                            </div>
                            <MessageCircle size={16} className="new-conv-msg" />
                        </button>
                    ))}
                </div>
            )}

            <button className="btn btn-ghost btn-sm new-conv-cancel" onClick={onCancel}>
                Cancel
            </button>
        </div>
    );
}

export default NewConversationPicker;
