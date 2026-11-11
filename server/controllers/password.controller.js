const crypto = require("crypto");
const User = require("../models/User");
const { hashPassword, verifyPassword } = require("../utils/password");
const { revokeAllForUser } = require("../utils/sessions");
const { deliverResetEmail } = require("../utils/mailer");

const RESET_TTL_MS = 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ errors: ["Email is required"] });

        // Identical response whether or not the account exists (no enumeration).
        const generic = {
            message: "If an account with that email exists, a password reset link has been sent."
        };

        const user = await User.findOne({ email });
        if (user) {
            // P0-03: random single-use token; only its SHA-256 hash is stored.
            const raw = crypto.randomBytes(32).toString("base64url");
            user.resetPasswordToken = sha256(raw);
            user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
            await user.save();
            // F-02: the token is delivered out-of-band only - never returned
            // in the response body.
            await deliverResetEmail(user.email, raw);
        }

        res.status(200).json(generic);
    } catch (error) {
        return next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ errors: ["Token and new password are required"] });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ errors: ["New password must be at least 6 characters"] });
        }

        const user = await User.findOne({
            resetPasswordToken: sha256(token),
            resetPasswordExpires: { $gt: new Date() }
        });
        if (!user) return res.status(400).json({ errors: ["Invalid or expired token"] });

        user.password = await hashPassword(newPassword);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        // Credential change: every existing session is revoked (P0-02).
        await revokeAllForUser(user._id);

        res.json({ message: "Password has been reset successfully." });
    } catch (error) {
        return next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ errors: ["Current and new passwords are required"] });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ errors: ["New password must be at least 6 characters"] });
        }

        const user = await User.findById(req.user.id);
        const match = await verifyPassword(user.password, currentPassword);
        if (!match) return res.status(400).json({ errors: ["Current password is incorrect"] });

        user.password = await hashPassword(newPassword);
        await user.save();
        // P0-02: a password change invalidates every existing session.
        await revokeAllForUser(req.user.id);

        res.json({ message: "Password has been changed successfully." });
    } catch (error) {
        return next(error);
    }
};

module.exports = { forgotPassword, resetPassword, changePassword };
