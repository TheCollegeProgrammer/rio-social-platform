const defaultOrigins = [
    "http://localhost:5173",
    "https://rio-social-platform-git-main-devansh-avchats-projects.vercel.app",
    "https://rio-social-platform.vercel.app"
];
const envOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Shared by Express CORS and the Socket.IO handshake so both accept
// exactly the same origins (credentials: true on both sides).
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

module.exports = { allowedOrigins };
