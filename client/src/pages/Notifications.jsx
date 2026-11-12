import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, X, CheckCheck } from "lucide-react";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    mediaUrl
} from "../services/api";
import { useNotificationSync } from "../lib/useNotificationSync";
import { ICONS, PROFILE_LINK_TYPES, timeAgo, notificationText } from "../lib/notificationMeta";
import FollowRequests from "../components/FollowRequests";
import "./Notifications.css";

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
    // 5.8/5.9: refetch on new notification and after reconnect.
    useNotificationSync(load);

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

            <FollowRequests onChange={load} />

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
                            : PROFILE_LINK_TYPES.includes(n.type) && n.sender ? `/users/${n.sender._id}` : null;
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
