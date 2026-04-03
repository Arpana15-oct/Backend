const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
} = require("../controllers/usercontroller");

const authMiddleware = require("../middleware/authmiddleware");
const allowRoles = require("../middleware/rolemiddleware");

// Only admin can manage users

router.post("/", authMiddleware, allowRoles("admin"), createUser);
router.get("/", authMiddleware, allowRoles("admin"), getUsers);
router.get("/:id", authMiddleware, allowRoles("admin"), getUserById);

// profile update (name/email only)
router.patch("/:id", authMiddleware, allowRoles("admin"), updateUser);

//  separate role change
router.patch("/:id/role", authMiddleware, allowRoles("admin"), changeUserRole);

router.patch("/:id/status", authMiddleware, allowRoles("admin"), changeUserStatus);

module.exports = router;