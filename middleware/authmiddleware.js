const jwt = require("jsonwebtoken");
const User = require("../models/usermodel");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Token has expired.",
        });
      }
      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid token.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token verification failed.",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User no longer exists.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Your account is inactive.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
      ...(isDev && { error: error.message }),
    });
  }
};

module.exports = authenticate;