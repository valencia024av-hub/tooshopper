// src/components/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

// ⚙️ Pon aquí tu(s) correo(s) de admin (debe coincidir con Header.jsx)
const ADMIN_EMAILS = ["info@tooshopper.com"];

function isAdminUser(user) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  const email = String(user.email || "").trim().toLowerCase();
  return user.isAdmin === true || role === "admin" || ADMIN_EMAILS.includes(email);
}

export default function PrivateRoute(props) {
  const requireAdmin = !!(props && props.requireAdmin);
  const location = useLocation();

  // 1) Requiere estar autenticado (solo verificamos que exista token)
  const token = localStorage.getItem("token");
  if (!token) {
    localStorage.removeItem("me");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2) Si la ruta exige admin, validamos contra el perfil guardado por Header.jsx
  if (requireAdmin) {
    let me = null;
    try {
      me = JSON.parse(localStorage.getItem("me") || "null");
    } catch (err) {
      void err; // evita warning de "no-unused-vars"
      me = null; // si falla el parseo, tratamos como no-admin
    }
    if (!isAdminUser(me)) {
      return <Navigate to="/" replace />;
    }
  }

  // 3) OK → renderiza la ruta protegida
  return <Outlet />;
}
