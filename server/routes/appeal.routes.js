const express = require("express");
const protect = require("../middleware/auth.middleware");
const { createAppeal, myAppeals } = require("../controllers/appeal.controller");

const router = express.Router();

router.get("/mine", protect, myAppeals);
router.post("/", protect, createAppeal);

module.exports = router;
