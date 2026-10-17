import { useEffect, useRef } from "react";
import gsap from "gsap";
import { reducedMotion } from "../lib/utils";
import { NETWORK_CONFIG as C, rand } from "../lib/network";
import { createScene } from "../lib/networkScene";
import { drawScene } from "../lib/networkRender";
import "../styles/AmbientNetwork.css";

function AmbientNetworkBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext("2d");
        const reduced = reducedMotion();
        let w = 0;
        let h = 0;
        let scene = null;
        let last = 0;
        let attached = false;
        let schedule = null;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, C.dprCap);
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            scene = createScene(w, h);
        };

        const tick = (time) => {
            const dt = Math.min(0.05, Math.max(0.001, time - last));
            last = time;
            drawScene(ctx, w, h, scene, time, dt, false);
        };

        const attach = () => { if (!attached) { gsap.ticker.add(tick); attached = true; } };
        const detach = () => { if (attached) { gsap.ticker.remove(tick); attached = false; } };
        const onVis = () => (document.hidden ? detach() : attach());

        let resizeTimer = null;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resize();
                if (reduced) drawScene(ctx, w, h, scene, 0, 0, true);
            }, 150);
        };

        resize();
        if (reduced) {
            drawScene(ctx, w, h, scene, 0, 0, true);
        } else {
            attach();
            const scheduleNext = () => {
                schedule = gsap.delayedCall(rand(C.signalEvery[0], C.signalEvery[1]), () => {
                    scene.spawnSignal();
                    scheduleNext();
                });
            };
            scheduleNext();
            document.addEventListener("visibilitychange", onVis);
        }
        window.addEventListener("resize", onResize);

        return () => {
            detach();
            if (schedule) schedule.kill();
            clearTimeout(resizeTimer);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, []);

    return (
        <div className="ambient-network" aria-hidden="true">
            <canvas ref={canvasRef} />
        </div>
    );
}

export default AmbientNetworkBackground;
