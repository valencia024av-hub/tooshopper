import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./AuthForms.css";

const API = import.meta.env.VITE_API_URL || ""; // http://localhost:5000 en .env

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Si venías de una ruta protegida, vuelve allá; si no, /perfil
  const from = location.state?.from?.pathname || "/perfil";

  const onSubmit = async ({ email, password }) => {
    setMsg("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || "Error al iniciar sesión");

      localStorage.setItem("token", result.token);      // guarda sesión
      window.dispatchEvent(new Event("auth-changed"));  // 🔔 notifica al Header
      navigate(from, { replace: true });                // redirige
    } catch (error) {
      setMsg(error.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="auth-container">
      <h2>Iniciar sesión</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input
          type="email"
          placeholder="Correo electrónico"
          {...register("email", {
            required: "El correo es obligatorio",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Correo no válido" }
          })}
        />
        {errors.email && <p className="error">{errors.email.message}</p>}

        <input
          type="password"
          placeholder="Contraseña"
          {...register("password", {
            required: "La contraseña es obligatoria",
            minLength: { value: 6, message: "Mínimo 6 caracteres" }
          })}
        />
        {errors.password && <p className="error">{errors.password.message}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>

        {msg && <p className="error" style={{ marginTop: 8 }}>{msg}</p>}
      </form>

      <p className="alt-action">
        ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
    </div>
  );
}
