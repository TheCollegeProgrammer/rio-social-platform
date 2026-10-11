const path = require("path");
const fs = require("fs");
const User = require("../models/User");

const uploadDir = path.join(__dirname, "..", "uploads");

const serveFile = (req, res) => {
    const filePath = path.join(uploadDir, path.basename(req.params.filename));
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ errors: ["File not found"] });
    }
    res.sendFile(filePath);
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ errors: ["Image file is required"] });
        }
        const user = await User.findById(req.user.id);
        if (user.avatar) {
            const old = path.join(uploadDir, path.basename(user.avatar));
            if (fs.existsSync(old)) fs.unlinkSync(old);
        }
        user.avatar = `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ message: "Avatar uploaded", avatar: user.avatar });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

const uploadCover = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ errors: ["Image file is required"] });
        }
        const user = await User.findById(req.user.id);
        if (user.coverImage) {
            const old = path.join(uploadDir, path.basename(user.coverImage));
            if (fs.existsSync(old)) fs.unlinkSync(old);
        }
        user.coverImage = `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ message: "Cover uploaded", coverImage: user.coverImage });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

const deleteImage = async (req, res) => {
    try {
        const { field } = req.params;
        if (!["avatar", "coverImage"].includes(field)) {
            return res.status(400).json({ errors: ["Invalid image field"] });
        }
        const user = await User.findById(req.user.id);
        const current = user[field];
        if (!current) {
            return res.status(400).json({ errors: ["No image to delete"] });
        }
        const filePath = path.join(uploadDir, path.basename(current));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        user[field] = "";
        await user.save();
        res.json({ message: `${field} deleted` });
    } catch (error) {
        res.status(500).json({ errors: ["Server error"] });
    }
};

module.exports = { serveFile, uploadAvatar, uploadCover, deleteImage };
