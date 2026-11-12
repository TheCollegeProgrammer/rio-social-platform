const express = require("express");
const protect = require("../middleware/auth.middleware");
const upload = require("../config/upload");
const { pushToCloudinary } = require("../middleware/cloudinary.middleware");
const { validateImages } = require("../middleware/validateImage");
const { uploadLimiter } = require("../middleware/ratelimit");
const {
    createDraft,
    listDrafts,
    getDraft,
    updateDraft,
    deleteDraft
} = require("../controllers/draft.controller");
const { publishDraft } = require("../controllers/draft-publish.controller");

const router = express.Router();

// 7.2: every draft route is owner-private - no public/read-for-all access.
router.use(protect);
router.get("/", listDrafts);
router.post(
    "/",
    uploadLimiter,
    upload.array("image", 8),
    validateImages,
    pushToCloudinary("drafts"),
    createDraft
);
router.get("/:id", getDraft);
router.patch(
    "/:id",
    upload.array("image", 8),
    validateImages,
    pushToCloudinary("drafts"),
    updateDraft
);
router.delete("/:id", deleteDraft);
router.post("/:id/publish", publishDraft);

module.exports = router;
