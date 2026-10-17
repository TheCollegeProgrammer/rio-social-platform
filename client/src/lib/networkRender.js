import { NETWORK_CONFIG as C, makeGlowSprite } from "./network";

const spriteNode = makeGlowSprite(C.colors.node);
const spriteHub = makeGlowSprite(C.colors.hub);
const spriteSig = makeGlowSprite(C.colors.signal);

export function drawScene(ctx, w, h, scene, time, dt, reduced) {
    if (!reduced) scene.update(time, dt);
    const { nodes, edges, particles } = scene;
    const signals = scene.signals();

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = C.baseLineWidth;
    for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        ctx.strokeStyle = `rgba(${C.colors.line},${C.lineOpacity + e.energy * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    for (const p of particles) {
        ctx.fillStyle = `rgba(${C.colors.node},${p.a})`;
        ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    for (const s of signals) {
        const a = nodes[s.edge.a];
        const b = nodes[s.edge.b];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const back = s.dir > 0 ? -1 : 1;
        for (let k = 0; k < 6; k++) {
            const f0 = k / 6;
            const f1 = (k + 1) / 6;
            const t0 = s.t + back * (C.signalTrail / len) * f0;
            const t1 = s.t + back * (C.signalTrail / len) * f1;
            if (Math.min(t0, t1) < -0.05 || Math.max(t0, t1) > 1.05) continue;
            ctx.strokeStyle = `rgba(${C.colors.signal},${s.alpha * (1 - f1) * 0.5})`;
            ctx.lineWidth = s.size * (1 - f1 * 0.7);
            ctx.beginPath();
            ctx.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
            ctx.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
            ctx.stroke();
        }
        const hx = a.x + (b.x - a.x) * s.t;
        const hy = a.y + (b.y - a.y) * s.t;
        const gs = s.size * 9;
        ctx.globalAlpha = s.alpha;
        ctx.drawImage(spriteSig, hx - gs / 2, hy - gs / 2, gs, gs);
        ctx.globalAlpha = 1;
    }
    for (const n of nodes) {
        const pulse = reduced ? 0.35 : 0.5 + 0.5 * Math.sin(time * n.pulse * 2.2 + n.phase);
        const glow = Math.max(pulse, n.energy);
        const spr = n.hub ? spriteHub : spriteNode;
        const gs = n.r * 8;
        ctx.globalAlpha = 0.12 + glow * 0.5;
        ctx.drawImage(spr, n.x - gs / 2, n.y - gs / 2, gs, gs);
        ctx.globalAlpha = 0.55 + glow * 0.45;
        ctx.fillStyle = n.hub ? `rgba(${C.colors.hub},1)` : `rgba(${C.colors.node},1)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.75 + glow * 0.4), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}
