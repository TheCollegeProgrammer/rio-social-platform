import { useEffect, useState } from "react";
import { logoutUser, getCurrentUser } from "../services/api";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = async () => {
        await logoutUser();
        setUser(null);
    };

    const manualLogin = async () => {
        try {
            const data = await getCurrentUser();
            setUser(data.user);
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

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout, manualLogin }}>
            {children}
        </AuthContext.Provider>
    );
};
