const express = require("express");
const protect = require("../middleware/auth.middleware");
const { register, login, me, logout, getProfile } = require("../controllers/auth.controller");
const { forgotPassword, resetPassword, changePassword } = require("../controllers/password.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/logout", logout);
router.get("/profile/:id", protect, getProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", protect, changePassword);

module.exports = router;
