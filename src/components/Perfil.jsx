import { useEffect, useState } from "react";
import { getMe } from "../services/auth";

export default function Perfil() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    getMe(t)
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, []);

  if (!user) return <p style={{padding:16}}>Cargando…</p>;

  return (
    <div style={{padding:16}}>
      <h2>Mi perfil</h2>
      <p><b>Nombre:</b> {user.name || "—"}</p>
      <p><b>Email:</b> {user.email}</p>
      <p><b>Rol:</b> {user.role}</p>
    </div>
  );
}
