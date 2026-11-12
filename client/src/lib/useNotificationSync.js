import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";

// 5.8/5.9: refetch the notification list when one arrives and after a
// reconnect — REST stays the source of truth, so no duplicate items or
// ordering bugs from replayed pushes.
export function useNotificationSync(reload) {
    const { socket } = useSocket();
    useEffect(() => {
        if (!socket || typeof reload !== "function") return undefined;
        socket.on("notification:new", reload);
        socket.on("connect", reload);
        return () => {
            socket.off("notification:new", reload);
            socket.off("connect", reload);
        };
    }, [socket, reload]);
}
