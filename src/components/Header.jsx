// src/components/Header.jsx
import "./Header.css";
import { FaSearch, FaShoppingCart } from "react-icons/fa";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "../services/auth";
import { getCart } from "../lib/cart";

// 👉 PON AQUÍ TU(S) CORREO(S) DE ADMIN
const ADMIN_EMAILS = ["info@tooshopper.com"];

function isAdminUser(user) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  const email = String(user.email || "").trim().toLowerCase();
  return user.isAdmin === true || role === "admin" || ADMIN_EMAILS.includes(email);
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // Cambia estilo del header al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lee el usuario actual usando getMe() (leyendo token desde localStorage dentro del servicio)
  function fetchUser() {
    getMe()
      .then((data) => {
        // según tu backend puede venir como { user: {...} } o el usuario directo
        const u = data?.user || data;
        if (u) {
          setUser(u);
          // guardamos en cache para PrivateRoute
          localStorage.setItem("me", JSON.stringify(u));
        } else {
          setUser(null);
          localStorage.removeItem("me");
        }
      })
      .catch(() => {
        // token inválido/expirado o error de red
        localStorage.removeItem("token");
        localStorage.removeItem("me");
        setUser(null);
      });
  }

  // Carga usuario + contador del carrito y escucha cambios
  useEffect(() => {
    fetchUser();

    const loadCartCount = () => {
      const items = getCart();
      const count = items.reduce((acc, it) => acc + (it.qty || 1), 0);
      setCartCount(count);
    };
    loadCartCount();

    const authHandler = () => fetchUser();
    const cartHandler = () => loadCartCount();

    window.addEventListener("auth-changed", authHandler);
    window.addEventListener("cart-changed", cartHandler);

    return () => {
      window.removeEventListener("auth-changed", authHandler);
      window.removeEventListener("cart-changed", cartHandler);
    };
  }, []);

  // Cerrar sesión desde el header
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("me");
    setUser(null);
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/login");
  };

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`} role="banner">
      <div className="container">
        {/* LOGO */}
        <div className="logo1">
          <Link to="/" aria-label="Ir al inicio">
            <img src="/logo1.png" alt="Tooshopper" />
          </Link>
        </div>

        {/* MENÚ */}
        <nav className="nav" aria-label="Principal">
          <NavLink to="/nuevo"  className={({ isActive }) => (isActive ? "active" : undefined)}>Nuevo</NavLink>
          <NavLink to="/mujer"  className={({ isActive }) => (isActive ? "active" : undefined)}>Mujer</NavLink>
          <NavLink to="/hombre" className={({ isActive }) => (isActive ? "active" : undefined)}>Hombre</NavLink>
          <NavLink to="/sale"   className={({ isActive }) => `sale ${isActive ? "active" : ""}`}>SALE</NavLink>
        </nav>

        {/* ACCIONES */}
        <div className="actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Buscar"
            onClick={() => navigate("/buscar")}
            title="Buscar"
          >
            <FaSearch />
          </button>

          <button
            type="button"
            className="icon-button cart-button"
            aria-label={`Carrito (${cartCount})`}
            onClick={() => navigate("/carrito")}
            title={`Carrito (${cartCount})`}
          >
            <FaShoppingCart />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>

          {/* Link Admin solo si es admin */}
          {user && isAdminUser(user) && (
            <Link to="/admin/orders" className="auth-link" title="Panel administrativo">
              Admin
            </Link>
          )}

          {user ? (
            <>
              <Link to="/perfil" className="auth-link">
                Hola, {user.name || user.email}
              </Link>
              <button type="button" className="auth-link" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/registro" className="auth-link">Registrarse</Link>
              <Link to="/login" className="auth-link">Iniciar sesión</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

