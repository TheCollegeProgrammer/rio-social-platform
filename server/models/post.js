const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },

        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        hashtags: [
            {
                type: String,
                lowercase: true,
                trim: true
            }
        ],

        image: {
            type: String,
            default: null
        },

        images: {
            type: [String],
            default: []
        },

        category: {
            type: String,
            default: null
        },

        editedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

postSchema.index({ content: "text", hashtags: "text" });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
