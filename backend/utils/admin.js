// utils/admin.js  (versión CommonJS con require)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email = "") {
  return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}

module.exports = { isAdminEmail };
