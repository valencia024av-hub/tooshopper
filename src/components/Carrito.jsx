// src/components/Carrito.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCart, updateQtyDelta, removeFromCart, removeComboGroup } from "../lib/cart";

export default function Carrito() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = () => setItems(getCart());
    load();
    window.addEventListener("cart-changed", load);
    return () => window.removeEventListener("cart-changed", load);
  }, []);

  const total = items.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);

  if (!items.length) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Carrito</h2>
        <p>Tu carrito está vacío.</p>
        <Link to="/nuevo">Ver productos</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Carrito</h2>

      <ul style={{ listStyle: "none", padding: 0, maxWidth: 820 }}>
        {items.map((it) => {
          const key = `${it.id}::${it.comboGroup || ""}`;
          const isCombo = !!it.comboGroup;

          return (
            <li
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr auto auto",
                gap: 12,
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.name}
                  width={70}
                  height={70}
                  style={{ objectFit: "cover", borderRadius: 8 }}
                />
              ) : (
                <div style={{ width: 70, height: 70, background: "#f3f3f3", borderRadius: 8 }} />
              )}

              <div>
                <div style={{ fontWeight: 600 }}>
                  {it.name} {isCombo && <span style={{ fontWeight: 400, opacity: 0.7 }}>(Combo)</span>}
                </div>
                <div style={{ opacity: 0.8 }}>
                  ${((it.price || 0) * (it.qty || 1)).toLocaleString()}{" "}
                  <span style={{ opacity: 0.6 }}>( {it.qty} × ${Number(it.price || 0).toLocaleString()} )</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isCombo ? (
                  <>
                    <button onClick={() => updateQtyDelta(it.id, it.comboGroup, -1)} aria-label="Disminuir">
                      −
                    </button>
                    <span style={{ minWidth: 24, textAlign: "center" }}>{it.qty || 1}</span>
                    <button onClick={() => updateQtyDelta(it.id, it.comboGroup, +1)} aria-label="Aumentar">
                      +
                    </button>
                  </>
                ) : (
                  <span style={{ minWidth: 24, textAlign: "center" }}>{it.qty || 1}</span>
                )}
              </div>

              {!isCombo ? (
                <button onClick={() => removeFromCart(it.id, it.comboGroup)} style={{ color: "#c00" }}>
                  Eliminar
                </button>
              ) : (
                <button onClick={() => removeComboGroup(it.comboGroup)} style={{ color: "#c00" }}>
                  Eliminar combo
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h3>Total: ${total.toLocaleString()}</h3>
      <Link to="/checkout">Ir a pagar</Link>
    </div>
  );
}
