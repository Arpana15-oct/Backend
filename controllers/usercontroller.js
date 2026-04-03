const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/usermodel");

const VALID_ROLES = ["viewer", "analyst", "admin"];
const VALID_STATUSES = ["active", "inactive"];

const createUser = async (req, res) => {
  try {
    const { name, email, role, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${VALID_ROLES.join(", ")}.`,
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // Generate a temporary password for admin-created users
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "viewer",
      status: status || "active",
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        // Return temp password so admin can share it with the user
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to create user.",
      ...(isDev && { error: error.message }),
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${VALID_ROLES.join(", ")}.`,
        });
      }
      filter.role = role;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
        });
      }
      filter.status = status;
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * pageSize;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password") // never return password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: users.length,
      total,
      currentPage: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      data: users,
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      ...(isDev && { error: error.message }),
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      ...(isDev && { error: error.message }),
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists.",
        });
      }
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to update user.",
      ...(isDev && { error: error.message }),
    });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${VALID_ROLES.join(", ")}.`,
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to update user role.",
      ...(isDev && { error: error.message }),
    });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    }

    if (req.user._id.toString() === id && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Prevent deactivating the last active admin
    if (user.role === "admin" && user.status === "active" && status === "inactive") {
      const activeAdmins = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdmins === 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate the last active admin.",
        });
      }
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status updated successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Failed to update user status.",
      ...(isDev && { error: error.message }),
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
};