import { useEffect, useState } from "react";
import { getNotifications, getUnreadMessageCount } from "../services/api";

// Module-level shared polling: one interval + one in-flight guard for all
// consumers (Navbar, LeftNav, BottomNav) — no duplicate requests.
let snapshot = { notifs: 0, msgs: 0 };
const listeners = new Set();
let timer = null;
let running = false;

const onVisibility = () => {
    if (!document.hidden) poll();
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
}

function teardown() {
    if (listeners.size > 0 || !timer) return;
    clearInterval(timer);
    timer = null;
    document.removeEventListener("visibilitychange", onVisibility);
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
