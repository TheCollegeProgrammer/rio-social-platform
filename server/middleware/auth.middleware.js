const { verifyAccess } = require("../utils/tokens");
const { isSessionActive } = require("../utils/sessions");

const unauthorized = (res, message) =>
    res.status(401).json({ errors: [message], message });

// Requires a valid access token AND a live server-side session.
// P0-02: every request is bound to a session so logout/password-change/
// account-deletion take effect immediately (stateless JWT alone cannot).
const protect = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return unauthorized(res, "Not authenticated");

    let decoded;
    try {
        decoded = verifyAccess(token);
    } catch {
        return unauthorized(res, "Invalid or expired token");
    }
    if (!decoded.sid) return unauthorized(res, "Invalid or expired token");

    let active;
    try {
        active = await isSessionActive(decoded.sid);
    } catch (error) {
        return next(error);
    }
    if (!active) return unauthorized(res, "Session expired");

    req.user = { id: decoded.id, sid: decoded.sid };
    next();
};

module.exports = protect;
