import { useEffect, useRef } from "react";

export function useAutoLoad(sentinelRef, trigger, active, deps) {
    const triggerRef = useRef(trigger);
    triggerRef.current = trigger;

    useEffect(() => {
        const el = sentinelRef.current;
        if (!active || !el || typeof IntersectionObserver === "undefined") return undefined;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) triggerRef.current();
        }, { rootMargin: "400px 0px" });
        io.observe(el);
        return () => io.disconnect();
    }, [sentinelRef, active, ...deps]);
}
