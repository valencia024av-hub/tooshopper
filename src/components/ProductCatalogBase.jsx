// src/components/ProductCatalogBase.jsx
import { useEffect, useState } from "react";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function ProductCatalogBase({ title, query = "" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErr("");
        // Nota: si aún no tienes categorías en la BD, usa solo inStock/sort/limit
        const url = `/api/products${query || ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudieron cargar productos");
        if (mounted) setItems(data.items || []);
      } catch (e) {
        if (mounted) setErr(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [query]);

  return (
    <section style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>

      {loading && <p>Cargando productos…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {!loading && !err && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((p) => (
            <div key={p._id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  background: "#f3f3f3",
                  borderRadius: 8,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "#888",
                }}
              >
                Sin imagen
              </div>
              <h3 style={{ fontSize: 16, margin: "6px 0" }}>{p.name}</h3>
              <p style={{ margin: 0 }}>{currency.format(p.price || 0)}</p>
              <small style={{ opacity: 0.7 }}>Stock: {p.available_stock ?? 0}</small>
              <div style={{ marginTop: 8 }}>
                <button>Ver más</button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.8 }}>
              No hay productos para mostrar.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
