require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`WARNING: missing env vars -> ${missing.join(", ")}`);
}
console.log(
    `Startup: PORT=${process.env.PORT || "(unset)"} ` +
    `NODE_ENV=${process.env.NODE_ENV || "(unset)"} ` +
    `CLOUDINARY=${process.env.CLOUDINARY_CLOUD_NAME ? "yes" : "no"}`
);

connectDB();

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
