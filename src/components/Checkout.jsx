// src/components/Checkout.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart } from "../lib/cart";
import { getMe } from "../services/auth";

const API = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const looksLikeObjectId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  outline: "none",
};

export default function Checkout() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    nombre: "", email: "", telefono: "",
    direccion: "", ciudad: "", notas: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  // 1) Cargar carrito + total
  useEffect(() => {
    const load = () => {
      const c = getCart();
      setItems(c);
      setTotal(c.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0));
    };
    load();
    window.addEventListener("cart-changed", load);
    return () => window.removeEventListener("cart-changed", load);
  }, []);

  // 2) Prefill desde el usuario (si hay token)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    getMe(token)
      .then((data) => {
        const u = data?.user || data || {};
        setForm((f) => ({ ...f, nombre: u.name || f.nombre, email: u.email || f.email }));
      })
      .catch(() => { /* ignorar: sin token o inválido */ });
  }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // 3) Completar variantes faltantes consultando el backend
  async function fillMissingVariants(itemsNorm) {
    const out = [];
    for (const it of itemsNorm) {
      if (it.productId || it.variant || !it.sku) {
        out.push(it);
        continue;
      }
      try {
        const url = `${API}/api/products?sku=${encodeURIComponent(it.sku)}&limit=1`;
        const r = await fetch(url);
        const j = await r.json().catch(() => ({}));
        const variant = j?.items?.[0]?.variant || "M"; // por si no llega nada, usa 'M'
        out.push({ ...it, variant });
      } catch {
        // si falla la consulta, no bloqueamos; mandamos tal cual para ver el error del server
        out.push(it);
      }
    }
    return out;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!items.length) return alert("Tu carrito está vacío.");
    if (!form.nombre || !form.email || !form.direccion || !form.ciudad) {
      return alert("Completa nombre, email, dirección y ciudad.");
    }

    setLoading(true);
    try {
      // Normaliza items: usa productId si parece ObjectId; si no, usa sku (+ variant si existe)
      const baseItems = items.map((it) => {
        const candidateId = it.productId || it._id || it.id;
        const productId = looksLikeObjectId(candidateId) ? candidateId : null;
        const sku = String(it.sku || it.SKU || it.code || it.ref || it.reference || "").trim() || null;
        const variant = (it.variant == null ? null : String(it.variant).trim()) || null;

        return {
          productId,
          sku,
          variant,                 // si falta, lo rellenamos abajo
          name: it.name || null,   // útil para auditoría
          qty: Math.max(1, Number(it.qty || 1)),
        };
      });

      // Completa las variantes que falten
      const itemsPayload = await fillMissingVariants(baseItems);

      const payload = {
        items: itemsPayload,
        shipping: {
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          direccion: form.direccion,
          ciudad: form.ciudad,
          notas: form.notas || "",
        },
        customer: { nombre: form.nombre, email: form.email, telefono: form.telefono },
        paymentMethod: "nequi",
      };

      console.log("PAYLOAD >>", payload);

      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("RESPONSE <<", res.status, text);

      if (!res.ok) {
        let message = text;
        try {
          const j = JSON.parse(text);
          message = j?.message || j?.error || message;
        } catch { /* noop */ }
        throw new Error(message || "No se pudo crear la orden");
      }

      const data = JSON.parse(text);
      if (!data?.id) throw new Error("El backend no devolvió id de la orden");

      // éxito 👉 ir a pantalla de pago
      navigate(`/pagar/${data.id}`);
    } catch (e2) {
      setErr(e2?.message || "Error creando la orden");
    } finally {
      setLoading(false);
    }
  }

  if (!items.length) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Checkout</h2>
        <p>Tu carrito está vacío.</p>
        <Link to="/nuevo">Ver productos</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h2>Checkout</h2>

      {err && (
        <div style={{ background: "#ffe5e5", color: "#b00020", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
        <form onSubmit={onSubmit} style={{ background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
          <h3>Datos de envío</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <label>Nombre completo *<input name="nombre" value={form.nombre} onChange={onChange} required style={inputStyle} /></label>
            <label>Email *<input name="email" type="email" value={form.email} onChange={onChange} required style={inputStyle} /></label>
            <label>Teléfono<input name="telefono" value={form.telefono} onChange={onChange} style={inputStyle} /></label>
            <label>Dirección *<input name="direccion" value={form.direccion} onChange={onChange} required style={inputStyle} /></label>
            <label>Ciudad *<input name="ciudad" value={form.ciudad} onChange={onChange} required style={inputStyle} /></label>
            <label>Notas para el envío<textarea name="notas" value={form.notas} onChange={onChange} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></label>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? "Creando orden…" : "Confirmar pedido"}
          </button>
        </form>

        <aside style={{ background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
          <h3>Resumen</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((it) => (
              <li key={it.id || it._id || it.productId || it.sku || it.name} style={{
                display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 10, alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid #eee",
              }}>
                {it.image ? (
                  <img src={it.image} alt={it.name} width={60} height={60} style={{ objectFit: "cover", borderRadius: 8 }} />
                ) : (<div style={{ width: 60, height: 60, background: "#f3f3f3", borderRadius: 8 }} />)}
                <div>
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    x{it.qty || 1}{it.variant ? ` · ${it.variant}` : ""}
                  </div>
                </div>
                <div>${((Number(it.price) || 0) * (Number(it.qty) || 1)).toLocaleString()}</div>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>Total</span><span>${total.toLocaleString()}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
