import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "./ThemeToggle";
import { resetUnread } from "../lib/useUnreadCounts";
import { ScrollProgress } from "@/components/motion-primitives/scroll-progress";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { mediaUrl } from "../services/api";

function NavAvatar({ user }) {
    const src = mediaUrl(user.avatar);
    if (src) return <img className="nav-avatar-img" src={src} alt="" />;
    return <div className="nav-avatar">{user.name?.charAt(0).toUpperCase()}</div>;
}

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        resetUnread();
        navigate("/login");
    };

    return (
        <nav aria-label="Top">
            <Link to="/" className="nav-brand" aria-label="RIO home">
                <img className="brand-logo brand-logo-light" src="/Rio-logo-Light-theme.png" alt="RIO" />
                <img className="brand-logo brand-logo-dark" src="/Rio-logo-Dark-theme.png" alt="RIO" />
            </Link>

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
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Log out" aria-label="Log out">
                        <LogOut size={15} />
                    </button>
                </div>
            )}
            <ScrollProgress className="bg-[var(--accent-strong)]" />
        </nav>
    );
}

export default Navbar;
