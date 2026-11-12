import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, MessageSquare, Bell, Bookmark, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useUnreadCounts, resetUnread } from "../../lib/useUnreadCounts";
import { mediaUrl } from "../../services/api";
import "./LeftNav.css";

function LeftNav() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { notifs, msgs } = useUnreadCounts();

    const handleLogout = async () => {
        await logout();
        resetUnread();
        navigate("/login");
    };

    const onBookmarks =
        location.pathname === "/profile" && location.search.includes("bookmarks");

    const items = [
        { to: "/", label: "Home", icon: Home, end: true },
        { to: "/search", label: "Explore", icon: Compass },
        { to: "/messages", label: "Messages", icon: MessageSquare, count: msgs },
        { to: "/notifications", label: "Notifications", icon: Bell, count: notifs }
    ];

    return (
        <aside className="left-nav" aria-label="Primary">
            <nav className="left-nav-links">
                {items.map(({ to, label, icon: Icon, end, count }) => (
                    <NavLink key={to} to={to} end={end} className="left-nav-link">
                        <span className="left-nav-icon">
                            <Icon size={20} />
                            {count > 0 && <span className="left-nav-badge">{count > 99 ? "99+" : count}</span>}
                        </span>
                        <span className="left-nav-label">{label}</span>
                    </NavLink>
                ))}
                <Link
                    to="/profile?tab=bookmarks"
                    className={`left-nav-link${onBookmarks ? " active" : ""}`}
                >
                    <span className="left-nav-icon"><Bookmark size={20} /></span>
                    <span className="left-nav-label">Bookmarks</span>
                </Link>
                <NavLink to="/profile" className="left-nav-link" end>
                    <span className="left-nav-icon"><User size={20} /></span>
                    <span className="left-nav-label">Profile</span>
                </NavLink>
                <NavLink to="/settings" className="left-nav-link">
                    <span className="left-nav-icon"><Settings size={20} /></span>
                    <span className="left-nav-label">Settings</span>
                </NavLink>
            </nav>

            {user && (
                <div className="left-nav-user">
                    <Link to="/profile" className="left-nav-user-row">
                        <span className="left-nav-avatar">
                            {mediaUrl(user.avatar) ? (
                                <img src={mediaUrl(user.avatar)} alt="" />
                            ) : (
                                user.name?.charAt(0).toUpperCase() || "?"
                            )}
                        </span>
                        <span className="left-nav-user-text">
                            <strong>{user.name}</strong>
                            <small>@{user.username}</small>
                        </span>
                    </Link>
                    <button className="left-nav-logout" onClick={handleLogout} aria-label="Log out" title="Log out">
                        <LogOut size={17} />
                    </button>
                </div>
            )}
        </aside>
    );
}

export default LeftNav;
