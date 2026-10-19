import { useEffect, useState } from "react";
import { API_ORIGIN } from "../services/http";
import "../styles/BackendReady.css";

const HEALTH_URL = `${API_ORIGIN}/health`;
const RETRY_MS = 3000;
const TIMEOUT_MS = 12000;
const SLOW_MS = 120000;

function BackendReady({ children }) {
    const [ready, setReady] = useState(false);
    const [slow, setSlow] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let active = true;
        let timer = null;
        let controller = null;
        let inflight = false;
        const started = Date.now();

        const ticker = setInterval(() => {
            if (!active) return;
            const secs = Math.round((Date.now() - started) / 1000);
            setElapsed(secs);
            if (secs * 1000 >= SLOW_MS) setSlow(true);
        }, 1000);

        const run = async () => {
            if (!active || inflight) return;
            inflight = true;
            controller = new AbortController();
            const abortTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
            let ok = false;
            try {
                const res = await fetch(HEALTH_URL, {
                    signal: controller.signal,
                    cache: "no-store",
                    headers: { Accept: "application/json" }
                });
                ok = res.ok;
            } catch {
                ok = false;
            } finally {
                clearTimeout(abortTimer);
                inflight = false;
                controller = null;
            }
            if (!active) return;
            if (ok) {
                setReady(true);
                return;
            }
            timer = setTimeout(run, RETRY_MS);
        };

        run();

        return () => {
            active = false;
            clearInterval(ticker);
            clearTimeout(timer);
            if (controller) controller.abort();
        };
    }, []);

    if (ready) return children;

    return (
        <div className="boot-screen" role="status" aria-live="polite">
            <div className="boot-logo">RIO</div>
            <div className="boot-spinner" aria-hidden="true" />
            <p className="boot-title">Waking up server, please wait...</p>
            <p className="boot-sub">
                {slow
                    ? "This is taking a bit longer than usual. We keep checking in the background — the site will open automatically."
                    : "Free-tier servers sleep when idle, so the first visit takes a moment."}
            </p>
            <span className="boot-elapsed">{elapsed}s</span>
        </div>
    );
}

export default BackendReady;
