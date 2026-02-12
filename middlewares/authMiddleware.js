const jwt = require("jsonwebtoken");

// Existing user protection
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer"))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.USER_ACCESS_TOKEN_SECRET);
    req.user = { userId: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// New Admin protection
exports.adminProtect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ message: "No admin token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    // Check if it's an admin token and has a valid role
    if (!decoded.isAdmin || !decoded.role) {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.admin = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
};

// Optional: Role-based restriction middleware
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        message: `You do not have permission to perform this action. Required roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};
