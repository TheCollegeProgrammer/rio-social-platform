const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const base = process.env.MONGO_URI;
        let uri = base;
        if (process.env.NODE_ENV === "test") {
            const q = base.indexOf("?");
            uri = q === -1 ? `${base}_test` : `${base.slice(0, q)}_test${base.slice(q)}`;
        }
        await mongoose.connect(uri);
        console.log(`MongoDB connected${process.env.NODE_ENV === "test" ? " (test DB)" : ""}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;