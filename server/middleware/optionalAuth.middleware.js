const { verifyAccess } = require("../utils/tokens");
const { isSessionActive } = require("../utils/sessions");

// Like protect, but never blocks: sets req.user only when the access token
// verifies AND its session is still live (revoked/expired sessions read as
// logged-out, so private feeds and authz checks stay correct).
const optionalAuth = async (req, res, next) => {
    req.user = null;
    const token = req.cookies.token;
    if (!token) return next();

    let decoded;
    try {
        decoded = verifyAccess(token);
    } catch {
        return next();
    }
    if (!decoded.sid) return next();

    try {
        if (await isSessionActive(decoded.sid)) {
            req.user = { id: decoded.id, sid: decoded.sid };
        }
    } catch (error) {
        return next(error);
    }
    next();
};

module.exports = optionalAuth;
