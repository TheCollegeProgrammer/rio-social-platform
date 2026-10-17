const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { isRemote, destroyRemote } = require("../config/cloudinary");

const uploadDir = path.join(__dirname, "..", "uploads");

const removeStored = (url) => {
    if (!url) return;
    if (isRemote(url)) return destroyRemote(url);
    const fp = path.join(uploadDir, path.basename(url));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
};

const serveFile = (req, res) => {
    const filePath = path.join(uploadDir, path.basename(req.params.filename));
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ errors: ["File not found"] });
    }
    res.sendFile(filePath);
};

const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ errors: ["Image file is required"] });
        }
        const user = await User.findById(req.user.id);
        removeStored(user.avatar);
        user.avatar = req.file.remoteUrl || `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ message: "Avatar uploaded", avatar: user.avatar });
    } catch (error) {
        return next(error);
    }
};

const uploadCover = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ errors: ["Image file is required"] });
        }
        const user = await User.findById(req.user.id);
        removeStored(user.coverImage);
        user.coverImage = req.file.remoteUrl || `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ message: "Cover uploaded", coverImage: user.coverImage });
    } catch (error) {
        return next(error);
    }
};

const deleteImage = async (req, res, next) => {
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
        removeStored(current);
        user[field] = "";
        await user.save();
        res.json({ message: `${field} deleted` });
    } catch (error) {
        return next(error);
    }
};

module.exports = { serveFile, uploadAvatar, uploadCover, deleteImage };
