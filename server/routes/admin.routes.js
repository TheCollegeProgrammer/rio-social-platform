const express = require("express");
const protect = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");
const {
    suspendUser,
    restoreUser,
    getAuditLogs
} = require("../controllers/admin.controller");
const { listReports, getReport, updateReport } = require("../controllers/report-admin.controller");
const { listAppeals, decideAppeal } = require("../controllers/appeal.controller");

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/audit", getAuditLogs);
router.get("/reports", listReports);
router.get("/reports/:id", getReport);
router.patch("/reports/:id", updateReport);
router.get("/appeals", listAppeals);
router.patch("/appeals/:id", decideAppeal);
router.post("/users/:id/suspend", suspendUser);
router.post("/users/:id/restore", restoreUser);

module.exports = router;
