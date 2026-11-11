const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const { globalLimiter } = require("./middleware/ratelimit");
const csrfProtection = require("./middleware/csrf.middleware");
const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const profileRoutes = require("./routes/profile.routes");
const followRoutes = require("./routes/follow.routes");
const notificationRoutes = require("./routes/notification.routes");
const messageRoutes = require("./routes/message.routes");
const uploadRoutes = require("./routes/upload.routes");
const adminRoutes = require("./routes/admin.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

const defaultOrigins = [
    "http://localhost:5173",
    "https://rio-social-platform-git-main-devansh-avchats-projects.vercel.app",
    "https://rio-social-platform.vercel.app"
];
const envOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

// Render terminates TLS and forwards via its router: trust exactly one hop so
// req.ip (and rate-limit keys) reflect the real client, not the proxy.
// Never use `true` here - that would trust arbitrary X-Forwarded-For chains.
app.set("trust proxy", 1);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
        res.setHeader(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        );
    }
    next();
});

app.use("/api", globalLimiter);
app.use("/api", csrfProtection(allowedOrigins));

app.get("/health", (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({ status: dbReady ? "ok" : "starting" });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", followRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(notFound);
app.use(errorHandler);

module.exports = app;