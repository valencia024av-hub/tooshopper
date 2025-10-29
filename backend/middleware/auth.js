const jwt = require('jsonwebtoken');
const { isAdminEmail } = require('../utils/admin');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded DEBE tener email
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function requireAdmin(req, res, next) {
  const email = (req.user?.email || "").trim().toLowerCase();
  // permite por email de .env o por rol 'admin'
  if (isAdminEmail(email) || req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Solo admin: tu cuenta no tiene permisos." });
}

module.exports = { requireAuth, requireAdmin };
