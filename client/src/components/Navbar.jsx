import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "./ThemeToggle";
import { CATEGORIES } from "../lib/categories";
import { ScrollProgress } from "@/components/motion-primitives/scroll-progress";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { getNotifications, getUnreadMessageCount, mediaUrl } from "../services/api";

function NavAvatar({ user }) {
    const src = mediaUrl(user.avatar);
    if (src) return <img className="nav-avatar-img" src={src} alt="" />;
    return <div className="nav-avatar">{user.name?.charAt(0).toUpperCase()}</div>;
}

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [unreadMsgs, setUnreadMsgs] = useState(0);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const load = () => {
            getNotifications(1)
                .then((d) => { if (!cancelled) setUnread(d.unreadCount); })
                .catch(() => { });
            getUnreadMessageCount()
                .then((d) => { if (!cancelled) setUnreadMsgs(d.unreadCount); })
                .catch(() => { });
        };
        load();
        const id = setInterval(load, 30000);
        return () => { cancelled = true; clearInterval(id); };
    }, [user]);

    const handleLogout = async () => {
        await logout();
        setUnread(0);
        setUnreadMsgs(0);
        navigate("/login");
    };

    return (
        <nav>
            <Link to="/" className="nav-brand" aria-label="RIO home">
                <img className="brand-logo brand-logo-light" src="/Rio-logo-Light-theme.png" alt="RIO" />
                <img className="brand-logo brand-logo-dark" src="/Rio-logo-Dark-theme.png" alt="RIO" />
            </Link>

            {user && (
                <>
                    <NavLink to="/" className="nav-link" end>Home</NavLink>
                    <NavLink to="/search" className="nav-link">Explore</NavLink>
                    {Object.entries(CATEGORIES).map(([slug, c]) => (
                        <NavLink key={slug} to={`/${slug}`} className="nav-link nav-cat" title={c.title}>
                            <c.icon size={16} />
                            <span className="nav-cat-label">{c.label}</span>
                        </NavLink>
                    ))}
                    <NavLink to="/messages" className="nav-link">
                        Messages
                        {unreadMsgs > 0 && <span className="nav-badge nav-badge-inline">{unreadMsgs > 99 ? "99+" : unreadMsgs}</span>}
                    </NavLink>
                    <NavLink to="/profile" className="nav-link">Profile</NavLink>
                    <NavLink to="/notifications" className="nav-icon-link" title="Notifications">
                        <Bell size={19} />
                        {unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
                    </NavLink>
                </>
            )}

            <div className="nav-spacer" />
            <ThemeToggle />

            {!user && (
                <>
                    <Link to="/login" className="nav-link">Login</Link>
                    <Magnetic>
                        <Link to="/register" className="btn btn-sm">Sign up</Link>
                    </Magnetic>
                </>
            )}

            {user && (
                <div className="nav-user">
                    <Link to="/settings" className="nav-user" title="Settings">
                        <NavAvatar user={user} />
                        <span className="nav-username">{user.username}</span>
                    </Link>
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Log out">
                        <LogOut size={15} />
                    </button>
                </div>
            )}
            <ScrollProgress className="bg-[var(--accent-strong)]" />
        </nav>
    );
}

export default Navbar;
