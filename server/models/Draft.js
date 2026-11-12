const mongoose = require("mongoose");

// 7.2: owner-private post drafts. Separate collection from Post so drafts
// can never surface in feeds/search; `version` powers safe autosave (7.3).
const draftSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        content: { type: String, default: "", maxlength: 5000 },
        category: { type: String, default: "" },
        visibility: { type: String, enum: ["public", "followers"], default: "public" },
        images: { type: [String], default: [] },
        version: { type: Number, default: 1 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Draft", draftSchema);
