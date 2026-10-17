const express = require("express");
const protect = require("../middleware/auth.middleware");
const upload = require("../config/upload");
const { pushToCloudinary } = require("../middleware/cloudinary.middleware");
const {
    uploadAvatar,
    uploadCover,
    deleteImage
} = require("../controllers/upload.controller");

const router = express.Router();

router.post("/avatar", protect, upload.single("image"), pushToCloudinary("avatars"), uploadAvatar);
router.post("/cover", protect, upload.single("image"), pushToCloudinary("covers"), uploadCover);
router.delete("/:field", protect, deleteImage);

module.exports = router;
