import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './FeaturedProducts.css';

// ===== helpers =====
function familyFromSku(sku) {
  const parts = String(sku || '').split('-');
  return parts.length >= 2
    ? (parts[0] + '-' + parts[1]).toUpperCase()
    : String(sku || '').toUpperCase();
}

function firstImage(p) {
  // En MongoDB Atlas las imágenes vienen en el array "images"
  if (p && Array.isArray(p.images) && p.images.length) return p.images[0];
  if (p && p.image) return p.image;
  return null;
}

function productPath(p) {
  // PRIORIDAD: Usar el _id de MongoDB para que el backend lo encuentre siempre
  if (p && p._id) return '/producto/' + String(p._id);
  if (p && p.sku) return '/producto/' + familyFromSku(p.sku);
  return '/nuevo';
}

function cleanName(name) {
  return String(name || '')
    .replace(/\s*\([^()]*\)\s*/g, ' ') 
    .replace(/\s{2,}/g, ' ')           
    .trim();
}

export default function FeaturedProducts() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);     
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // 1. Cargar datos desde el Backend (MongoDB)
  useEffect(() => {
    let alive = true;
    (async function () {
      try {
        setLoading(true);
        setErr('');

        // Llamada a tu API real
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, { cache: 'no-store' });
        
        if (!response.ok) throw new Error('Error al conectar con el servidor');
        
        const data = await response.json();
        
        // Tu backend devuelve { items: [...] }, extraemos esa lista
        const arr = Array.isArray(data.items) ? data.items : [];

        if (alive) {
          if (arr.length > 0) {
            setAllItems(arr);
          } else {
            setErr('No se encontraron productos en la base de datos');
          }
        }
      } catch (error) {
        if (alive) setErr('Error cargando productos: ' + error.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 2. Filtrar y seleccionar los 5 productos específicos
  useEffect(() => {
    if (!allItems.length) return;

    const TARGETS_IN_ORDER = [
      'POLO-BASICA-BLANCO',
      'POLO-BASICA-AZUL',
      'BOSS-BASICA-NEGRO',
      'BOSS-BASICA-BLANCO',
      'BOSS-BASICA-AZUL'
    ];

    function pickOneBySkuPreferM(arr, sku) {
      const list = arr.filter(p => String(p.sku || '').toUpperCase() === sku);
      if (!list.length) return null;
      // Preferimos variante M (la que acabamos de importar a Atlas)
      const m = list.find(p => String(p.variant || '').toUpperCase() === 'M');
      return m || list[0];
    }

    const selected = [];
    for (const sku of TARGETS_IN_ORDER) {
      const item = pickOneBySkuPreferM(allItems, sku);
      if (item) selected.push(item);
    }

    // Si por alguna razón no encuentra los SKUs, mostramos los primeros 5 de la DB
    setItems(selected.length ? selected.slice(0, 5) : allItems.slice(0, 5));
  }, [allItems]);

  return (
    <section className="featured-products" aria-labelledby="featured-title">
      <h2 id="featured-title" className="title">Productos Destacados</h2>

      {loading && <p style={{ textAlign: 'center' }}>Conectando con inventario real…</p>}
      {err && !loading && <p style={{ textAlign: 'center', color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <div className="products-grid">
          {items.map((p) => {
            const img = firstImage(p);
            const to = productPath(p);
            const title = cleanName(p?.name);

            return (
              <article className="product-card" key={p?._id || p?.sku}>
                <Link to={to} aria-label={`Ver ${title}`} className="image-wrap">
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
                      overflow: 'hidden'
                    }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    ) : (
                      <span style={{ fontSize: 13, color: '#888' }}>Sin imagen</span>
                    )}
                  </div>
                </Link>

                <h3 className="product-title">
                  <Link to={to} className="product-link" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {title}
                  </Link>
                </h3>

                <button
  type="button"
  className="btn-more"
  onClick={() => p.available_stock > 0 && navigate(to)} 
  disabled={p.available_stock <= 0} 
  style={{
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: p.available_stock > 0 ? '#111' : '#ccc', // Gris si es 0
    color: '#fff',
    fontWeight: 600,
    cursor: p.available_stock > 0 ? 'pointer' : 'not-allowed',
    marginTop: '10px'
  }}
>
  {p.available_stock > 0 ? 'Ver más' : 'Agotado'} 
</button>

              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}