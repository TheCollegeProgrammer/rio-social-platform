import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { getFollowers, getFollowing, mediaUrl } from "../services/api";
import "./FollowListPopover.css";

function FollowRow({ user }) {
    const src = mediaUrl(user.avatar);
    return (
        <Link to={`/users/${user._id}`} className="follow-row">
            <div className="small-avatar" style={{ width: 36, height: 36 }}>
                {src ? <img src={src} alt="" /> : user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="follow-row-info">
                <strong>{user.name}</strong>
                <span>@{user.username}{user.bio ? ` — ${user.bio.slice(0, 40)}` : ""}</span>
            </div>
        </Link>
    );
}

function FollowListPopover({ userId, type, count }) {
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    useEffect(() => {
        if (!open || users.length) return;
        let cancelled = false;
        const fn = type === "followers" ? getFollowers : getFollowing;
        fn(userId)
            .then((d) => { if (!cancelled) setUsers(d[type] || []); })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, userId, type, users.length]);

    const toggle = () => {
        if (!open) { setLoading(true); setError(""); }
        setOpen((o) => !o);
    };

    const label = type === "followers" ? "Followers" : "Following";

    return (
        <div className="follow-popover-wrap" ref={ref}>
            <button type="button" className="stat-link" onClick={toggle}>
                <strong>{count}</strong> {label}
            </button>

            {open && (
                <div className="follow-popover">
                    <div className="follow-popover-head">
                        <span>{label}</span>
                        <button className="follow-popover-close" onClick={() => setOpen(false)}><X size={15} /></button>
                    </div>
                    <div className="follow-popover-body">
                        {loading ? (
                            <p className="muted">Loading...</p>
                        ) : error ? (
                            <p className="error-message">{error}</p>
                        ) : users.length === 0 ? (
                            <p className="muted">No {label.toLowerCase()} yet</p>
                        ) : (
                            users.map((u) => <FollowRow key={u._id} user={u} />)
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default FollowListPopover;
