const User = require("../models/User");
const { hashPassword, verifyPassword, needsRehash } = require("../utils/password");
const {
    signAccess,
    verifyAccess,
    csrfFor,
    accessTtlMs,
    refreshTtlMs
} = require("../utils/tokens");
const { createSession, revokeSession } = require("../utils/sessions");

const isProd = () => process.env.NODE_ENV === "production";

const baseCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: "/"
});

// Cookie order matters: `token` must be first (test harness reads cookie[0]).
const setAuthCookies = (res, { userId, sid, refreshRaw }) => {
    const base = baseCookieOptions();
    res.cookie("token", signAccess(userId, sid), {
        ...base,
        maxAge: accessTtlMs()
    });
    res.cookie("refresh_token", refreshRaw, { ...base, maxAge: refreshTtlMs() });
    res.cookie("csrf_token", csrfFor(sid), {
        ...base,
        httpOnly: false,
        maxAge: refreshTtlMs()
    });
};

const clearAuthCookies = (res) => {
    const base = baseCookieOptions();
    res.clearCookie("token", base);
    res.clearCookie("refresh_token", base);
    res.clearCookie("csrf_token", { ...base, httpOnly: false });
};

const register = async (req, res, next) => {
    try {
        const { username, name, age, email, password } = req.body;
        const errors = [];

        if (!username || username.length < 3) errors.push("Username must be at least 3 characters");
        if (!email || !/\S+@\S+\.\S+/.test(email)) errors.push("Valid email required");
        if (!password || password.length < 6) errors.push("Password must be at least 6 characters");
        if (!name) errors.push("Name is required");
        if (!age || age < 0 || typeof age !== "number") errors.push("Valid age required");

        if (errors.length > 0) return res.status(400).json({ errors });

        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ errors: ["User already exists"] });

        const hashed = await hashPassword(password);
        const user = await User.create({ username, name, age, email, password: hashed });

        const session = await createSession(user._id, req.headers["user-agent"]);
        setAuthCookies(res, session);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        return next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const errors = [];

        if (!email) errors.push("Email is required");
        if (!password) errors.push("Password is required");
        if (errors.length > 0) return res.status(400).json({ errors });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ errors: ["Invalid email or password"] });
        if (user.isSuspended) {
            return res.status(403).json({ errors: ["Account suspended"] });
        }

        const match = await verifyPassword(user.password, password);
        if (!match) return res.status(401).json({ errors: ["Invalid email or password"] });

        // P0-04: upgrade legacy bcrypt hashes to argon2id on successful login.
        if (needsRehash(user.password)) {
            user.password = await hashPassword(password);
            await user.save();
        }

        const session = await createSession(user._id, req.headers["user-agent"]);
        setAuthCookies(res, session);
        res.json({ message: "Login successful" });
    } catch (error) {
        return next(error);
    }
};

// Idempotent: clears cookies even when the access token is already dead.
const logout = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = verifyAccess(token);
            if (decoded.sid) await revokeSession(decoded.sid);
        }
    } catch {
        // invalid/expired token - cookies still get cleared below
    }
    clearAuthCookies(res);
    res.json({ message: "Logout successful" });
};

const me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(401).json({ errors: ["Not authenticated"], message: "Not authenticated" });
        }
        res.json({ user });
    } catch (error) {
        return next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ errors: ["User not found"] });
        res.json({ user });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    me,
    getProfile,
    setAuthCookies,
    clearAuthCookies
};
