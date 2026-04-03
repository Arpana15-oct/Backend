const express = require("express");
const router = express.Router();

const {
  getDashboardSummary,
  getCategoryTotals,
  getRecentActivity,
  getMonthlyTrends,
  getThisMonthSummary,
  getTopSpendingCategories,
} = require("../controllers/dashboardcontroller");

const authMiddleware = require("../middleware/authmiddleware");
const allowRoles = require("../middleware/rolemiddleware");


router.get("/summary", authMiddleware, allowRoles("viewer", "analyst", "admin"), getDashboardSummary);
router.get("/summary/month", authMiddleware, allowRoles("viewer", "analyst", "admin"), getThisMonthSummary);

router.get("/top-categories", authMiddleware, allowRoles("viewer", "analyst", "admin"), getTopSpendingCategories);
router.get("/categories", authMiddleware, allowRoles("viewer", "analyst", "admin"), getCategoryTotals);

router.get("/recent", authMiddleware, allowRoles("viewer", "analyst", "admin"), getRecentActivity);
router.get("/trends/monthly", authMiddleware, allowRoles("viewer", "analyst", "admin"), getMonthlyTrends);

module.exports = router;