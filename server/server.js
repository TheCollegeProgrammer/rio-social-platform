require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
const weakSecret =
    process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32;

if (isProd) {
    // Fail closed in production: no secret value is ever printed.
    const fatal = [...missing];
    if (process.env.JWT_SECRET && weakSecret) {
        fatal.push("JWT_SECRET (must be at least 32 characters)");
    }
    if (fatal.length) {
        console.error(`FATAL: invalid production configuration -> ${fatal.join(", ")}`);
        process.exit(1);
    }
} else if (missing.length) {
    console.error(`WARNING: missing env vars -> ${missing.join(", ")}`);
}
console.log(
    `Startup: PORT=${process.env.PORT || "(unset)"} ` +
    `NODE_ENV=${process.env.NODE_ENV || "(unset)"} ` +
    `CLOUDINARY=${process.env.CLOUDINARY_CLOUD_NAME ? "yes" : "no"}`
);

connectDB();

// Socket.IO rides the same HTTP server (REST stays fully intact).
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
