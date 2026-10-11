const express = require("express");
const protect = require("../middleware/auth.middleware");
const upload = require("../config/upload");
const {
    uploadAvatar,
    uploadCover,
    deleteImage
} = require("../controllers/upload.controller");

const router = express.Router();

router.post("/avatar", protect, upload.single("image"), uploadAvatar);
router.post("/cover", protect, upload.single("image"), uploadCover);
router.delete("/:field", protect, deleteImage);

module.exports = router;
