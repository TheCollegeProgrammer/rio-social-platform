const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });

const setAuthCookie = (res, token) => {
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
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

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ username, name, age, email, password: hashed });

        setAuthCookie(res, generateToken(user._id));
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

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ errors: ["Invalid email or password"] });

        setAuthCookie(res, generateToken(user._id));
        res.json({ message: "Login successful" });
    } catch (error) {
        return next(error);
    }
};

const logout = (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logout successful" });
};

const me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(401).json({ errors: ["Not authenticated"] });
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

module.exports = { register, login, logout, me, getProfile, generateToken, setAuthCookie };
