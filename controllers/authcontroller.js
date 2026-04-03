const User = require("../models/usermodel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("adminSecret received:", req.body.adminSecret);
    console.log("env secret:", process.env.ADMIN_SECRET);
    console.log("match:", req.body.adminSecret === process.env.ADMIN_SECRET);


    // Create user — role and status are NOT taken from req.body
  const role =
  req.body.adminSecret && req.body.adminSecret === process.env.ADMIN_SECRET
    ? "admin"
    : "viewer";

   const user = await User.create({
  name,
  email,
  password: hashedPassword,
  role,
  status: "active",
});

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    // Don't leak internals in production
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Registration failed.",
      ...(isDev && { error: err.message }),
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user
    const user = await User.findOne({ email }).select("+password"); // need password for comparison

    // Status check before password compare
    if (user && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive.",
      });
    }

    // Use same error for not found + wrong password (prevents user enumeration)
    const isMatch = user && (await bcrypt.compare(password, user.password));
    if (!user || !isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Login failed.",
      ...(isDev && { error: err.message }),
    });
  }
};

module.exports = { register, login };