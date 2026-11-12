const express = require("express");
const protect = require("../middleware/auth.middleware");
const { createReport } = require("../controllers/report.controller");

const router = express.Router();

router.post("/", protect, createReport);

module.exports = router;
