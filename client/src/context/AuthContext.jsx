import { useEffect, useState } from "react";
import { logoutUser, getCurrentUser } from "../services/api";
import { notifyAuthChange, onAuthChange } from "../services/sessionSync";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = async () => {
        await logoutUser();
        setUser(null);
        notifyAuthChange("logout");
    };

    const manualLogin = async () => {
        try {
            const data = await getCurrentUser();
            setUser(data.user);
            notifyAuthChange("login");
        } catch {
            setUser(null);
        }
    };

    useEffect(() => {
        let cancelled = false;
        getCurrentUser()
            .then((data) => { if (!cancelled) setUser(data.user); })
            .catch(() => { if (!cancelled) setUser(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const handleSync = (type) => {
            if (type === "logout") {
                setUser(null);
                return;
            }
            getCurrentUser()
                .then((d) => setUser(d.user))
                .catch(() => setUser(null));
        };
        return onAuthChange(handleSync);
    }, []);

    useEffect(() => {
        const revalidate = () => {
            if (document.visibilityState !== "visible") return;
            getCurrentUser()
                .then((d) => setUser(d.user))
                .catch(() => setUser(null));
        };
        document.addEventListener("visibilitychange", revalidate);
        window.addEventListener("focus", revalidate);
        return () => {
            document.removeEventListener("visibilitychange", revalidate);
            window.removeEventListener("focus", revalidate);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout, manualLogin }}>
            {children}
        </AuthContext.Provider>
    );
};
