export const NETWORK_CONFIG = {
    density: 14000,
    minNodes: 34,
    maxNodes: 88,
    connectionDist: 170,
    lineOpacity: 0.15,
    baseLineWidth: 1,
    hubChance: 0.14,
    nodeMin: 1.1,
    nodeMax: 3.1,
    hubMin: 2.4,
    hubMax: 3.8,
    driftAmp: 11,
    driftSpeed: 0.11,
    particles: 26,
    signalEvery: [0.55, 1.6],
    signalSpeed: [45, 120],
    signalTrail: 70,
    maxSignals: 9,
    dprCap: 1.75,
    colors: {
        line: "70,140,60",
        node: "140,220,90",
        hub: "163,235,53",
        signal: "205,255,150"
    }
};

export const rand = (a, b) => a + Math.random() * (b - a);

export function makeGlowSprite(color) {
    const s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${color},0.9)`);
    grad.addColorStop(0.3, `rgba(${color},0.35)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return s;
}
