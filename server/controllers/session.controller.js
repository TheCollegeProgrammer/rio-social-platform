const { rotateSession, revokeAllForUser } = require("../utils/sessions");
const { setAuthCookies, clearAuthCookies } = require("./auth.controller");

// P0-02: exchange the httpOnly refresh cookie for a fresh access token.
// Rotation is atomic server-side; a superseded token replayed outside the
// grace window revokes the whole session (theft detection). Tokens are only
// ever re-set as cookies - never returned in the response body.
const refreshSession = async (req, res, next) => {
    try {
        const raw = req.cookies.refresh_token;
        if (!raw) {
            return res.status(401).json({ errors: ["No session"], message: "No session" });
        }

        const result = await rotateSession(raw);
        if (!result || result.reuseDetected) {
            clearAuthCookies(res);
            return res
                .status(401)
                .json({ errors: ["Session invalid"], message: "Session invalid" });
        }

        setAuthCookies(res, result);
        res.json({ message: "Session refreshed" });
    } catch (error) {
        return next(error);
    }
};

const logoutAll = async (req, res, next) => {
    try {
        await revokeAllForUser(req.user.id);
        clearAuthCookies(res);
        res.json({ message: "Logged out of all sessions" });
    } catch (error) {
        return next(error);
    }
};

module.exports = { refreshSession, logoutAll };
