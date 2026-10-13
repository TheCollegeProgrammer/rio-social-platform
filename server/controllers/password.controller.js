const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("./auth.controller");

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ errors: ["Email is required"] });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                message: "If an account with that email exists, a password reset link has been sent."
            });
        }

        const resetToken = jwt.sign(
            { id: user._id, purpose: "reset-password" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            resetToken,
            message: "Reset token generated (demo mode - normally sent via email)"
        });
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

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.purpose !== "reset-password") {
                return res.status(400).json({ errors: ["Invalid token purpose"] });
            }

            const user = await User.findById(decoded.id);
            if (!user) return res.status(404).json({ errors: ["User not found"] });

            user.password = await bcrypt.hash(newPassword, 10);
            user.resetPasswordToken = undefined;
            await user.save();

            res.json({ message: "Password has been reset successfully." });
        } catch (jwtError) {
            res.status(400).json({ errors: ["Invalid or expired token"] });
        }
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
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(400).json({ errors: ["Current password is incorrect"] });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password has been changed successfully." });
    } catch (error) {
        return next(error);
    }
};

module.exports = { forgotPassword, resetPassword, changePassword };
