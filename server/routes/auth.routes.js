const express = require("express");
const protect = require("../middleware/auth.middleware");
const { register, login, me, logout, getProfile } = require("../controllers/auth.controller");
const { refreshSession, logoutAll } = require("../controllers/session.controller");
const { forgotPassword, resetPassword, changePassword } = require("../controllers/password.controller");
const {
    registerLimiter,
    loginLimiter,
    resetLimiter,
    changePwLimiter
} = require("../middleware/ratelimit");

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshSession);
router.get("/me", protect, me);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);
router.get("/profile/:id", protect, getProfile);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/reset-password", resetLimiter, resetPassword);
router.post("/change-password", protect, changePwLimiter, changePassword);

module.exports = router;
