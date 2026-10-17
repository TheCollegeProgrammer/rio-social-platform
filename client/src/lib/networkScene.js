import { NETWORK_CONFIG as C, rand } from "./network";

export function createScene(w, h) {
    const count = Math.max(C.minNodes, Math.min(C.maxNodes, Math.floor((w * h) / C.density)));
    const nodes = Array.from({ length: count }, () => {
        const hub = Math.random() < C.hubChance;
        return {
            ox: rand(0, w),
            oy: rand(0, h),
            x: 0,
            y: 0,
            phase: rand(0, Math.PI * 2),
            pulse: rand(0.25, 0.8),
            hub,
            r: hub ? rand(C.hubMin, C.hubMax) : rand(C.nodeMin, C.nodeMax),
            energy: 0
        };
    });
    nodes.forEach((n) => { n.x = n.ox; n.y = n.oy; });

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].ox - nodes[j].ox;
            const dy = nodes[i].oy - nodes[j].oy;
            if (dx * dx + dy * dy < C.connectionDist * C.connectionDist) {
                edges.push({ a: i, b: j, energy: 0 });
            }
        }
    }

    const particles = Array.from({ length: C.particles }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(0.6, 1.8),
        a: rand(0.04, 0.14),
        vx: rand(-3, 3),
        vy: rand(-4, 2)
    }));

    let signals = [];

    const spawnSignal = () => {
        if (!edges.length || signals.length >= C.maxSignals) return;
        const edge = edges[Math.floor(Math.random() * edges.length)];
        const a = nodes[edge.a];
        const b = nodes[edge.b];
        const len = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        signals.push({
            edge,
            t: rand(0, 0.2),
            dir: 1,
            speed: rand(C.signalSpeed[0], C.signalSpeed[1]) / len,
            size: rand(1.5, 2.6),
            life: 0,
            alpha: 0
        });
    };

    const update = (time, dt) => {
        for (const n of nodes) {
            n.x = n.ox + Math.sin(time * C.driftSpeed + n.phase) * C.driftAmp;
            n.y = n.oy + Math.cos(time * C.driftSpeed * 0.8 + n.phase * 1.3) * C.driftAmp;
            n.energy = Math.max(0, n.energy - dt * 1.5);
        }
        signals = signals.filter((s) => {
            s.t += s.dir * s.speed * dt;
            s.life += dt;
            s.alpha = Math.min(1, s.life * 3.5) * Math.min(1, Math.min(s.t, 1 - s.t) * 8 + 0.2);
            s.edge.energy = Math.max(s.edge.energy, s.alpha * 0.7);
            if (s.t < 0 || s.t > 1) {
                nodes[s.edge[s.t < 0 ? "a" : "b"]].energy = 1;
                return false;
            }
            return true;
        });
        for (const p of particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;
        }
        for (const e of edges) e.energy *= Math.max(0, 1 - dt * 2.2);
    };

    return { nodes, edges, particles, signals: () => signals, spawnSignal, update };
}
