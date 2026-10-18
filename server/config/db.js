const mongoose = require("mongoose");

const buildUri = () => {
    const base = process.env.MONGO_URI;
    if (!base) return null;
    if (process.env.NODE_ENV !== "test") return base;
    const q = base.indexOf("?");
    return q === -1 ? `${base}_test` : `${base.slice(0, q)}_test${base.slice(q)}`;
};

const isTest = () => process.env.NODE_ENV === "test";

const connectDB = async () => {
    const uri = buildUri();
    if (!uri) {
        console.error("FATAL: MONGO_URI is not set - cannot connect to MongoDB");
        if (isTest()) process.exit(1);
        return;
    }
    let attempt = 0;
    for (;;) {
        attempt++;
        try {
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
            console.log(`MongoDB connected${isTest() ? " (test DB)" : ""}`);
            return;
        } catch (error) {
            console.error(`MongoDB connection failed (attempt ${attempt}): ${error.message}`);
            if (isTest()) process.exit(1);
            await new Promise((r) => setTimeout(r, 5000));
        }
    }
};

module.exports = connectDB;
