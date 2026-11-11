require("dotenv").config();
require("./utils/seedGuard");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { hashPassword } = require("./utils/password");
const User = require("./models/User");

const EMAIL = process.env.ADMIN_EMAIL || "admin@rio.app";

// Password precedence: explicit env -> fresh random (dev only) -> refuse in production.
// The password is only applied when creating the account, or when ADMIN_PASSWORD is
// explicitly provided (rotation). Existing accounts are never silently re-keyed.
const resolvePassword = () => {
    if (process.env.ADMIN_PASSWORD) return { password: process.env.ADMIN_PASSWORD, explicit: true };
    if (process.env.NODE_ENV === "production") {
        console.error("ADMIN_PASSWORD is required in production. Set it and re-run.");
        process.exit(1);
    }
    return { password: crypto.randomBytes(18).toString("base64url"), explicit: false };
};

(async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
    await mongoose.connect(process.env.MONGO_URI);

    const { password, explicit } = resolvePassword();
    const existing = await User.findOne({ email: EMAIL });

    if (existing) {
        existing.role = "admin";
        if (explicit) existing.password = await hashPassword(password);
        await existing.save();
        console.log(
            explicit
                ? `admin updated: ${EMAIL} (password rotated from ADMIN_PASSWORD)`
                : `admin role ensured: ${EMAIL} (password unchanged; set ADMIN_PASSWORD to rotate)`
        );
    } else {
        await User.create({
            username: "rio_admin",
            name: "RIO Admin",
            age: 30,
            email: EMAIL,
            password: await hashPassword(password),
            role: "admin",
            bio: "Platform admin - keeps RIO clean"
        });
        console.log(`admin created: ${EMAIL}`);
        console.log(explicit ? "(password from ADMIN_PASSWORD)" : `(generated dev password: ${password})`);
    }
    await mongoose.disconnect();
})().catch((e) => {
    console.error("create-admin failed:", e.message);
    process.exit(1);
});
