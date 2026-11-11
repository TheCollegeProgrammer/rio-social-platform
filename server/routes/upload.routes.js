const express = require("express");
const protect = require("../middleware/auth.middleware");
const upload = require("../config/upload");
const { uploadLimiter } = require("../middleware/ratelimit");
const { validateImages } = require("../middleware/validateImage");
const { pushToCloudinary } = require("../middleware/cloudinary.middleware");
const {
    uploadAvatar,
    uploadCover,
    deleteImage
} = require("../controllers/upload.controller");

const router = express.Router();

router.post("/avatar", protect, uploadLimiter, upload.single("image"), validateImages, pushToCloudinary("avatars"), uploadAvatar);
router.post("/cover", protect, uploadLimiter, upload.single("image"), validateImages, pushToCloudinary("covers"), uploadCover);
router.delete("/:field", protect, deleteImage);

module.exports = router;
