const { verifyAccess } = require("../utils/tokens");
const { isSessionActive } = require("../utils/sessions");

// Minimal cookie-header parser (the socket handshake never runs
// cookie-parser middleware).
const parseCookie = (header) => {
    const out = {};
    String(header || "").split(";").forEach((part) => {
        const i = part.indexOf("=");
        if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
    return out;
};

// 5.2: handshakes use the exact same trust chain as REST — access JWT
// bound to a live server-side session, so logout / password-change /
// account-deletion revoke sockets immediately too (P0-02 semantics).
const authenticate = async (handshake) => {
    const token = parseCookie(handshake.headers.cookie).token;
    if (!token) return null;
    let decoded;
    try {
        decoded = verifyAccess(token);
    } catch {
        return null;
    }
    if (!decoded || !decoded.sid) return null;
    try {
        if (!(await isSessionActive(decoded.sid))) return null;
    } catch {
        return null;
    }
    return { id: decoded.id, sid: decoded.sid };
};

module.exports = { parseCookie, authenticate };
