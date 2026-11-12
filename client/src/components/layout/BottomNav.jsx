import { NavLink } from "react-router-dom";
import { Home, Compass, MessageSquare, Bell, User } from "lucide-react";
import { useUnreadCounts } from "../../lib/useUnreadCounts";
import "./BottomNav.css";

function BottomNav() {
    const { notifs, msgs } = useUnreadCounts();

    const items = [
        { to: "/", label: "Home", icon: Home, end: true, count: 0 },
        { to: "/search", label: "Explore", icon: Compass, count: 0 },
        { to: "/messages", label: "Messages", icon: MessageSquare, count: msgs },
        { to: "/notifications", label: "Notifications", icon: Bell, count: notifs },
        { to: "/profile", label: "Profile", icon: User, count: 0 }
    ];

    return (
        <nav className="bottom-nav" aria-label="Mobile">
            {items.map(({ to, label, icon: Icon, end, count }) => (
                <NavLink key={to} to={to} end={end} className="bottom-nav-link" aria-label={label}>
                    <span className="bottom-nav-icon">
                        <Icon size={21} />
                        {count > 0 && <span className="bottom-nav-badge">{count > 99 ? "99+" : count}</span>}
                    </span>
                    <small>{label}</small>
                </NavLink>
            ))}
        </nav>
    );
}

export default BottomNav;
