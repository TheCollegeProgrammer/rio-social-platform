const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const isTest = () => process.env.NODE_ENV === "test";

// Env override wins; otherwise per-environment defaults (tests get headroom so the
// 181-test suite never trips a limiter, while security tests can still target the
// lower live defaults through the dedicated security suite's own low env values).
const envMax = (key, live, test) => {
    const v = Number(process.env[key]);
    if (Number.isFinite(v) && v > 0) return v;
    return isTest() ? test : live;
};

const send429 = (req, res) => {
    res.status(429).json({ errors: ["Too many requests, please try again later."] });
};

const WINDOW = 15 * 60 * 1000;

const build = (keyGenerator, limit, windowMs = WINDOW) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        handler: send429
    });

const ipKey = (req) => ipKeyGenerator(req.ip || "0.0.0.0");

const emailKey = (req) =>
    `${ipKey(req)}|${String((req.body && req.body.email) || "").toLowerCase()}`;

const userKey = (req) =>
    req.user && req.user.id ? `u:${req.user.id}` : ipKey(req);

// Layer 1: global per-IP budget (existing behaviour, env-tunable).
const globalLimiter = build(
    ipKey,
    envMax("RATE_LIMIT_MAX", 500, 10000)
);

// Layer 2: authentication-specific (per IP + per submitted email).
const loginLimiter = build(emailKey, envMax("AUTH_RATE_MAX", 15, 5000));
const registerLimiter = build(ipKey, envMax("REGISTER_RATE_MAX", 15, 5000));
const resetLimiter = build(emailKey, envMax("RESET_RATE_MAX", 5, 5000));
const changePwLimiter = build(userKey, envMax("CHANGE_PW_RATE_MAX", 10, 5000));

// Layer 3: per-account abuse budgets (keyed by session user, IP fallback pre-auth).
const followLimiter = build(userKey, envMax("FOLLOW_RATE_MAX", 300, 300));
const likeLimiter = build(userKey, envMax("LIKE_RATE_MAX", 300, 300));
const commentLimiter = build(userKey, envMax("COMMENT_RATE_MAX", 150, 300));
const bookmarkLimiter = build(userKey, envMax("BOOKMARK_RATE_MAX", 300, 300));
const messageLimiter = build(userKey, envMax("MESSAGE_RATE_MAX", 150, 300));

// Layer 3: upload budget per account.
const uploadLimiter = build(userKey, envMax("UPLOAD_RATE_MAX", 60, 5000));

module.exports = {
    globalLimiter,
    loginLimiter,
    registerLimiter,
    resetLimiter,
    changePwLimiter,
    followLimiter,
    likeLimiter,
    commentLimiter,
    bookmarkLimiter,
    messageLimiter,
    uploadLimiter
};
