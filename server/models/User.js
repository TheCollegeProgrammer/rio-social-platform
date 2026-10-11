const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },

        age: {
            type: Number,
            required: true,
            min: 0,
            max: 150
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        bio: {
            type: String,
            default: "",
            maxlength: 200
        },

        avatar: {
            type: String,
            default: ""
        },

        coverImage: {
            type: String,
            default: ""
        },

        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        bookmarks: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Post"
            }
        ],

        isPrivate: {
            type: Boolean,
            default: false
        },

        resetPasswordToken: {
            type: String
        }
    },
    { timestamps: true }
);

userSchema.index({ username: "text", name: "text" });

module.exports = mongoose.model("User", userSchema);
