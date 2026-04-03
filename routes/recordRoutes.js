const express = require("express");
const router = express.Router();

const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
} = require("../controllers/recordcontroller");

const authMiddleware = require("../middleware/authmiddleware");
const allowRoles = require("../middleware/rolemiddleware");

// Create — admin and analyst only
router.post(
  "/",
  authMiddleware,
  allowRoles("admin", "analyst"),
  createRecord
);

// Read all — all roles
router.get(
  "/",
  authMiddleware,
  getRecords
);

// Read single — all roles (consistent with read all)
router.get(
  "/:id",
  authMiddleware,
  getRecordById
);

// Update — admin only
router.patch(
  "/:id",
  authMiddleware,
  allowRoles("admin"),
  updateRecord
);

// Delete — admin only
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("admin"),
  deleteRecord
);

module.exports = router;