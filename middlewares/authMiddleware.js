/* =============================================================================
   middleware/authMiddleware.js — JWT verification and role-based authorization.

   verifyToken:  confirms the request carries a valid JWT, attaches the decoded
                 payload to req.user (expects { customerId, role, ... }).
   requireRole:  used AFTER verifyToken; blocks the request unless req.user.role
                 is one of the allowed roles for that route.
============================================================================= */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization; // expected: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // e.g. { customerId: 12, role: "customer", iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

// Usage: requireRole("vendor", "operator") — allows either role through.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized for this action" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };