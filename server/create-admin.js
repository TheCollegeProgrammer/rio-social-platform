require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

const EMAIL = "admin@rio.app";
const PASSWORD = "RioAdmin#2026";

(async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
    await mongoose.connect(process.env.MONGO_URI);
    const hash = await bcrypt.hash(PASSWORD, 10);
    const existing = await User.findOne({ email: EMAIL });
    if (existing) {
        existing.role = "admin";
        existing.password = hash;
        await existing.save();
        console.log(`admin updated: ${EMAIL} / ${PASSWORD} (role=admin)`);
    } else {
        await User.create({
            username: "rio_admin",
            name: "RIO Admin",
            age: 30,
            email: EMAIL,
            password: hash,
            role: "admin",
            bio: "Platform admin - keeps RIO clean"
        });
        console.log(`admin created: ${EMAIL} / ${PASSWORD}`);
    }
    await mongoose.disconnect();
})().catch((e) => {
    console.error("create-admin failed:", e);
    process.exit(1);
});
