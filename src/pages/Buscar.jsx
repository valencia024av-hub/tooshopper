// src/pages/Buscar.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function Buscar() {
  const [qParams, setQParams] = useSearchParams();
  const [q, setQ] = useState(qParams.get("q") || "");

  useEffect(() => {
    // sincroniza la query ?q=
    if (q) setQParams({ q });
    else setQParams({});
  }, [q, setQParams]);

  function onSubmit(e) {
    e.preventDefault();
    // aquí podrías hacer fetch a /api/products?q=... (por ahora solo mantenemos ?q=)
  }

  return (
    <section style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h2 style={{ textAlign: "center", marginBottom: 16 }}>Buscar productos</h2>

      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <input
          type="search"
          autoFocus
          placeholder="Ej: camiseta, polo, jean…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 540,
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 12,
            outline: "none"
          }}
        />
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 12 }}>
          Buscar
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: "center", color: "#666" }}>
        {q ? `Mostrando resultados para: "${q}" (pendiente de conectar al backend)` : "Escribe para buscar"}
      </div>
    </section>
  );
}
