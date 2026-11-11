const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ALGORITHMS = ["HS256"];

const ttlMs = (value) => {
    const m = /^(\d+)([smhd])$/.exec(value || "");
    if (!m) return 15 * 60 * 1000;
    const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
    return Number(m[1]) * unit;
};

const accessTtlMs = () => ttlMs(process.env.ACCESS_TOKEN_TTL || "15m");
const refreshTtlMs = () => ttlMs(process.env.REFRESH_TOKEN_TTL || "30d");

// Short-lived access token bound to a server-side session (sid).
const signAccess = (id, sid) =>
    jwt.sign({ id, sid }, process.env.JWT_SECRET, {
        expiresIn: Math.floor(accessTtlMs() / 1000),
        algorithm: "HS256"
    });

const verifyAccess = (token) =>
    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALGORITHMS });

// Stateless CSRF token derived from the session id: readable by first-party JS
// (non-httpOnly cookie) but unforgeable without JWT_SECRET.
const csrfFor = (sid) =>
    crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(`csrf:${sid}`)
        .digest("base64url");

const safeEqual = (a, b) => {
    const ba = Buffer.from(String(a || ""));
    const bb = Buffer.from(String(b || ""));
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

module.exports = {
    ttlMs,
    accessTtlMs,
    refreshTtlMs,
    signAccess,
    verifyAccess,
    csrfFor,
    safeEqual
};
