import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

const SocketContext = createContext(null);

// Connects exactly one shared socket while a session exists (5.1/5.2):
// login connects, logout disconnects. Keyed on the stable user id — not
// the user object — so focus-revalidation never churns the connection.
export function SocketProvider({ children }) {
    const { user } = useAuth();
    const userId = user?._id;
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!userId) {
            disconnectSocket();
            setConnected(false);
            return undefined;
        }
        const s = connectSocket();
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        s.on("connect", onConnect);
        s.on("disconnect", onDisconnect);
        setConnected(s.connected);
        return () => {
            s.off("connect", onConnect);
            s.off("disconnect", onDisconnect);
            disconnectSocket();
        };
    }, [userId]);

    const value = useMemo(() => ({ socket: getSocket(), connected }), [connected]);
    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
