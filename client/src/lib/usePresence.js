import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

// 5.5: live online/offline for one profile. Requests current state as
// soon as the socket is (or becomes) connected, then follows
// presence:update broadcasts. Pass null for your own profile.
export function usePresence(userId) {
    const { socket } = useSocket();
    const [online, setOnline] = useState(false);

    useEffect(() => {
        if (!socket || !userId) {
            setOnline(false);
            return undefined;
        }
        const onState = ({ userId: id, online: o }) => {
            if (id === userId) setOnline(!!o);
        };
        const ask = () => socket.emit("presence:get", { userId });

        socket.on("presence:state", onState);
        socket.on("presence:update", onState);
        if (socket.connected) ask();
        socket.on("connect", ask);
        return () => {
            socket.off("presence:state", onState);
            socket.off("presence:update", onState);
            socket.off("connect", ask);
            setOnline(false);
        };
    }, [socket, userId]);

    return { online };
}
