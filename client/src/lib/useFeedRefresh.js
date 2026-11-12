import { useEffect, useRef } from "react";

export function useFeedRefresh({ fetchPage, onFresh, active, intervalMs = 45000 }) {
    const fetchRef = useRef(fetchPage);
    const freshRef = useRef(onFresh);
    fetchRef.current = fetchPage;
    freshRef.current = onFresh;
    const busyRef = useRef(false);

    useEffect(() => {
        if (!active) return undefined;
        let cancelled = false;
        let timer = null;

        const refresh = async () => {
            if (cancelled || busyRef.current || document.hidden) return;
            busyRef.current = true;
            try {
                const data = await fetchRef.current();
                if (cancelled) return;
                // Never mutate the visible feed: hand new posts to the
                // caller so the user can reveal them from the pill.
                if (data.posts?.length) freshRef.current(data.posts);
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
