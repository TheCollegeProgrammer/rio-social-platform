const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const base = process.env.MONGO_URI;
        const uri = process.env.NODE_ENV === "test" ? `${base}_test` : base;
        await mongoose.connect(uri);
        console.log(`MongoDB connected${process.env.NODE_ENV === "test" ? " (test DB)" : ""}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;