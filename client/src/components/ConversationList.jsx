import { MessageCircle } from "lucide-react";
import Avatar from "./Avatar";

function timeLabel(date) {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationList({ conversations, activeId, currentUserId, onSelect }) {
    if (conversations.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon"><MessageCircle size={44} strokeWidth={1.3} /></div>
                <p>No conversations yet</p>
                <p className="faint">Visit a profile and hit Message to start one</p>
            </div>
        );
    }

    return (
        <div className="convo-list">
            {conversations.map((c) => {
                const other = c.participants.find((p) => p._id !== currentUserId);
                if (!other) return null;
                return (
                    <button
                        key={c._id}
                        className={`convo-item ${activeId === c._id ? "active" : ""}`}
                        onClick={() => onSelect(c)}
                    >
                        <Avatar user={other} />
                        <div className="convo-info">
                            <div className="convo-top">
                                <span className="convo-name">{other.name}</span>
                                <span className="convo-time">
                                    {timeLabel(c.lastMessage?.createdAt || c.updatedAt)}
                                </span>
                            </div>
                            <div className="convo-bottom">
                                <span className="convo-preview">
                                    {c.lastMessage?.content || "Say hi!"}
                                </span>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default ConversationList;
