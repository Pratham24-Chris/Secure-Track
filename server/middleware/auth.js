const jwt = require("jsonwebtoken");

/**
 * authMiddleware - verifies the httpOnly JWT cookie and enforces admin role.
 * Used on all /api/admin/* routes.
 *
 * Cookie is set by POST /verify-otp on successful login.
 * Cleared by POST /logout.
 */
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required. Please log in to access this resource.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, role, iat, exp }

    // Only admins may access /api/admin/* routes
    if (!decoded.role || decoded.role.toLowerCase() !== "admin") {
      return res.status(403).json({
        message: "Admin access required. You do not have permission for this action.",
      });
    }

    next();
  } catch (err) {
    // Token expired or tampered
    return res.status(401).json({
      message: "Session expired or invalid. Please log in again.",
    });
  }
};

module.exports = authMiddleware;
