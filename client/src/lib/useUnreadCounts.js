import { useEffect, useState } from "react";
import { getNotifications, getUnreadMessageCount } from "../services/api";
import { getSocket } from "./socket";

// Module-level shared polling: one interval + one in-flight guard for all
// consumers (Navbar, LeftNav, BottomNav) — no duplicate requests.
let snapshot = { notifs: 0, msgs: 0 };
const listeners = new Set();
let timer = null;
let running = false;
let boundSocket = null;

const onVisibility = () => {
    if (!document.hidden) poll();
};

// 5.8/5.9: socket pushes refresh badges immediately; a reconnect refetches
// anything missed while offline. poll() is authoritative (server counts).
const onSocketEvent = () => {
    poll();
};

async function poll() {
    if (running || document.hidden) return;
    running = true;
    try {
        const [n, m] = await Promise.all([
            getNotifications(1).catch(() => null),
            getUnreadMessageCount().catch(() => null)
        ]);
        const next = { ...snapshot };
        if (n) next.notifs = n.unreadCount;
        if (m) next.msgs = m.unreadUsers ?? m.unreadCount;
        if (next.notifs !== snapshot.notifs || next.msgs !== snapshot.msgs) {
            snapshot = next;
            listeners.forEach((fn) => fn(snapshot));
        }
    } finally {
        running = false;
    }
}

function ensure() {
    if (timer) return;
    timer = setInterval(() => {
        if (!document.hidden) poll();
    }, 30000);
    document.addEventListener("visibilitychange", onVisibility);
    boundSocket = getSocket();
    boundSocket.on("notification:new", onSocketEvent);
    boundSocket.on("message:new", onSocketEvent);
    boundSocket.on("message:status", onSocketEvent);
    boundSocket.on("connect", onSocketEvent);
}

function teardown() {
    if (listeners.size > 0 || !timer) return;
    clearInterval(timer);
    timer = null;
    document.removeEventListener("visibilitychange", onVisibility);
    if (boundSocket) {
        boundSocket.off("notification:new", onSocketEvent);
        boundSocket.off("message:new", onSocketEvent);
        boundSocket.off("message:status", onSocketEvent);
        boundSocket.off("connect", onSocketEvent);
        boundSocket = null;
    }
}

export function useUnreadCounts() {
    const [snap, setSnap] = useState(snapshot);
    useEffect(() => {
        listeners.add(setSnap);
        ensure();
        poll();
        return () => {
            listeners.delete(setSnap);
            teardown();
        };
    }, []);
    return snap;
}

export function resetUnread() {
    snapshot = { notifs: 0, msgs: 0 };
    listeners.forEach((fn) => fn(snapshot));
}
