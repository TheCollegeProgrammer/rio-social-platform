import { useEffect, useRef } from "react";

const MAX_TOP_OFFSET = 300;

export function useFeedRefresh({ fetchPage, setPosts, active, intervalMs = 45000 }) {
    const fetchRef = useRef(fetchPage);
    const setRef = useRef(setPosts);
    fetchRef.current = fetchPage;
    setRef.current = setPosts;
    const busyRef = useRef(false);

    useEffect(() => {
        if (!active) return undefined;
        let cancelled = false;
        let timer = null;

        const refresh = async () => {
            if (cancelled || busyRef.current || document.hidden) return;
            if (window.scrollY > MAX_TOP_OFFSET) return;
            busyRef.current = true;
            try {
                const data = await fetchRef.current(1);
                if (cancelled) return;
                setRef.current((prev) => {
                    const seen = new Set(prev.map((p) => p._id));
                    const fresh = (data.posts || []).filter((p) => !seen.has(p._id));
                    return fresh.length ? [...fresh, ...prev] : prev;
                });
            } catch {
                // network blip: keep current feed, retry next cycle
            } finally {
                busyRef.current = false;
            }
        };

        const onVisible = () => { if (!document.hidden) refresh(); };

        timer = setInterval(refresh, intervalMs);
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", refresh);

        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", refresh);
        };
    }, [active, intervalMs]);
}
