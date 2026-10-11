import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Reply, UserPlus, Bell, X, CheckCheck } from "lucide-react";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    mediaUrl
} from "../services/api";
import "./Notifications.css";

const ICONS = {
    like: Heart,
    comment: MessageCircle,
    reply: Reply,
    follow: UserPlus
};

function timeAgo(date) {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function notificationText(n) {
    const name = n.sender?.name || "Someone";
    switch (n.type) {
        case "like": return `${name} liked your post`;
        case "comment": return `${name} commented: "${n.comment?.content?.slice(0, 60)}"`;
        case "reply": return `${name} replied: "${n.comment?.content?.slice(0, 60)}"`;
        case "follow": return `${name} started following you`;
        default: return `${n.type} notification`;
    }
}

function Notifications() {
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        getNotifications(1)
            .then((d) => { setItems(d.notifications); setUnread(d.unreadCount); })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(load, [load]);

    const openNotification = async (n) => {
        try {
            if (!n.read) {
                await markNotificationRead(n._id);
                setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
                setUnread((u) => Math.max(0, u - 1));
            }
        } catch (e) { setError(e.message); }
    };

    const readAll = async () => {
        try {
            await markAllNotificationsRead();
            setItems((prev) => prev.map((x) => ({ ...x, read: true })));
            setUnread(0);
        } catch (e) { setError(e.message); }
    };

    const remove = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await deleteNotification(id);
            setItems((prev) => prev.filter((x) => x._id !== id));
        } catch (err) { setError(err.message); }
    };

    if (loading) return <div className="page"><p className="muted">Loading...</p></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Notifications {unread > 0 && <span className="unread-pill">{unread}</span>}</h1>
                {unread > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={readAll}>
                        <CheckCheck size={15} /> Mark all read
                    </button>
                )}
            </div>

            {error && <p className="error-message">{error}</p>}

            {items.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><Bell size={44} strokeWidth={1.3} /></div>
                    <p>No notifications yet</p>
                </div>
            ) : (
                <div className="notif-list">
                    {items.map((n) => {
                        const IconComp = ICONS[n.type] || Bell;
                        const link = n.post ? `/posts/${n.post._id}`
                            : n.type === "follow" && n.sender ? `/users/${n.sender._id}` : null;
                        const inner = (
                            <div className={`notif-item ${n.read ? "" : "unread"}`}>
                                <div className={`notif-icon ${n.type}`}>
                                    <IconComp size={16} fill={n.type === "like" ? "currentColor" : "none"} />
                                </div>
                                <div className="notif-avatar">
                                    {n.sender?.avatar ? (
                                        <img src={mediaUrl(n.sender.avatar)} alt="" />
                                    ) : (
                                        <span>{n.sender?.name?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="notif-body">
                                    <p className="notif-text">{notificationText(n)}</p>
                                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                                </div>
                                <button
                                    className="notif-delete"
                                    title="Delete"
                                    onClick={(e) => remove(e, n._id)}
                                ><X size={15} /></button>
                            </div>
                        );
                        return link ? (
                            <Link key={n._id} to={link} onClick={() => openNotification(n)}>
                                {inner}
                            </Link>
                        ) : (
                            <div key={n._id} onClick={() => openNotification(n)}>{inner}</div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Notifications;
