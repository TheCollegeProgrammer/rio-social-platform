const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { enabled: cloudinaryEnabled } = require("./cloudinary");

const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const fileFilter = (req, file, cb) => {
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
};

const limits = { fileSize: 5 * 1024 * 1024 };

let storage;
if (cloudinaryEnabled) {
    storage = multer.memoryStorage();
} else {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
        }
    });
}

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
