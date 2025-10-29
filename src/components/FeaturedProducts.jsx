// src/components/FeaturedProducts.jsx
import { useEffect, useState } from 'react';
import './FeaturedProducts.css';

const API = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:5000'
).replace(/\/+$/, '');


const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

export default function FeaturedProducts() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');

        // ✅ Ajusta este endpoint a como lo tengas en tu backend
        // Opciones comunes:
        // 1) /api/products?featured=true&inStock=true&limit=8
        // 2) /api/products?inHome=true&limit=8
        // 3) /api/products?inStock=true&limit=8 (como lo tenías)
        const res = await fetch('/api/products?featured=true&inStock=true&limit=8');

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los productos');
        if (mounted) setProductos(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error('FeaturedProducts error:', e);
        if (mounted) setErr(e.message || 'Error inesperado');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="featured-products" aria-labelledby="featured-title">
      <h2 id="featured-title" className="title">Productos Destacados</h2>

      {loading && <p style={{ textAlign: 'center' }}>Cargando productos…</p>}
      {err && <p style={{ textAlign: 'center', color: 'crimson' }}>Error: {err}</p>}

      {!loading && !err && (
        <div className="products-grid">
          {productos.map((p) => (
            <div className="product-card" key={p._id || p.id}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  background: '#f3f3f3',
                  borderRadius: 8,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  color: '#888',
                  overflow: 'hidden'
                }}
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  'Sin imagen'
                )}
              </div>

              <h3>{p.name}</h3>
              {'price' in p && <p>{currency.format(p.price || 0)}</p>}
              <button>Ver más</button>
            </div>
          ))}

          {productos.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
              No hay productos destacados todavía.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
