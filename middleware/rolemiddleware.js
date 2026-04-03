const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated.",
      });
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return res.status(500).json({
        success: false,
        message: "No roles specified for access control.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}.`,
      });
    }

    next();
  };
};

module.exports = allowRoles;