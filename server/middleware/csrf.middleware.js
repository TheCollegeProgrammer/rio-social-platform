const { verifyAccess, csrfFor, safeEqual } = require("../utils/tokens");

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const originOf = (req) => {
    if (req.headers.origin) return req.headers.origin;
    if (req.headers.referer) {
        try {
            return new URL(req.headers.referer).origin;
        } catch {
            return null;
        }
    }
    return null;
};

// Gate before all /api routes:
//  1. Reject mutating requests from an untrusted Origin/Referer (403).
//  2. Reject cookie-authenticated mutations without a valid X-CSRF-Token.
//     The token is HMAC(sid) - only first-party JS that can read the
//     csrf_token cookie can produce it. Requests with no access cookie
//     (login/register/forgot) are covered by the origin gate only.
const csrfProtection = (allowedOrigins) => (req, res, next) => {
    if (!MUTATING.has(req.method)) return next();

    const origin = originOf(req);
    if (origin && !allowedOrigins.includes(origin)) {
        return res
            .status(403)
            .json({ errors: ["Origin not allowed"], message: "Origin not allowed" });
    }

    const token = req.cookies.token;
    if (!token) return next();

    let sid;
    try {
        sid = verifyAccess(token).sid;
    } catch {
        return next();
    }
    if (!sid) return next();

    const provided = req.headers["x-csrf-token"];
    if (!provided || !safeEqual(provided, csrfFor(sid))) {
        return res.status(403).json({
            errors: ["Invalid or missing CSRF token"],
            message: "Invalid or missing CSRF token"
        });
    }
    next();
};

module.exports = csrfProtection;
