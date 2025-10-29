// src/components/ProductCatalogNuevo.jsx
import { useEffect, useMemo, useState } from 'react';
import './ProductCatalogNuevo.css';
import { addToCart } from '../lib/cart';
import { useNavigate } from 'react-router-dom';

// Resolver rutas de assets respetando el BASE_URL de Vite (útil en hosting en subcarpeta)
const BASE_URL = import.meta?.env?.BASE_URL || import.meta.env.BASE_URL || '/';
function resolveSrc(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const base = String(BASE_URL || '/').replace(/\/$/, '');
  const path = String(src).replace(/^\//, '');
  return `${base}/${path}`;
}

// === Base del API (evita el error de /products.json) ===
const API = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/+$/, '');

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const COLOR_HEX = {
  BLANCA: '#ffffff',
  BLANCO: '#ffffff',
  AZUL: '#031a42',
  'AZUL OSCURO': '#031a42',
  NEGRA: '#000000',
  NEGRO: '#000000',
  ROJA: '#B91C1C',
  VERDE: '#0f4d2f',
  'VERDE OSCURO': '#0f4d2f',
  BEIGE: '#D6D3D1',
  GRIS: '#9CA3AF',
};
const COLOR_WORDS = Object.keys(COLOR_HEX);
const ALL_SIZES = ['M', 'L', 'XL'];

// ---------- helpers ----------
function colorFromSkuOrName(item) {
  const sku = String(item?.sku || '');
  const fromSku = sku.split('-').pop().toUpperCase();
  if (COLOR_HEX[fromSku]) return fromSku;

  const name = String(item?.name || '').toUpperCase();
  for (let i = 0; i < COLOR_WORDS.length; i++) {
    const w = COLOR_WORDS[i];
    if (name.indexOf(w) !== -1) return w;
  }
  return 'BLANCA';
}
function familyFromSku(sku) {
  const parts = String(sku || '').split('-');
  return parts.length >= 2
    ? (parts[0] + '-' + parts[1]).toUpperCase()
    : String(sku || '').toUpperCase();
}
function stripParen(text) {
  return String(text || '').replace(/\s*\(.*?\)\s*$/, '').trim();
}
function stripColorWords(text) {
  const re = new RegExp('\\b(' + COLOR_WORDS.join('|') + ')\\b', 'gi');
  return String(text || '').replace(re, ' ').replace(/\s{2,}/g, ' ').trim();
}
function niceName(name) {
  return stripColorWords(stripParen(name));
}

// Normaliza products con variants.sizes a “docs por talla”
function normalizeProducts(arr) {
  const out = [];
  for (const p of arr) {
    if (Array.isArray(p?.variants) && p.variants.length) {
      for (const v of p.variants) {
        const imgs = Array.isArray(v.images) && v.images.length ? v.images : (Array.isArray(p.images) ? p.images : []);
        if (Array.isArray(v.sizes) && v.sizes.length) {
          for (const s of v.sizes) {
            out.push({
              ...p,
              _id: p._id,
              name: v.color ? `${p.name} ${v.color}` : p.name,
              variant: String(s.size || 'ÚNICA').toUpperCase(),
              available_stock: typeof s.stock === 'number' ? s.stock : (p.available_stock ?? 0),
              images: imgs
            });
          }
        } else {
          out.push({
            ...p,
            _id: p._id,
            name: v.color ? `${p.name} ${v.color}` : p.name,
            variant: 'ÚNICA',
            available_stock: p.available_stock ?? 0,
            images: imgs
          });
        }
      }
    } else {
      out.push(p);
    }
  }
  return out;
}

export default function ProductCatalogNuevo() {
  const navigate = useNavigate();
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState({}); // { [key]: { size, photo } }

  // Cargar desde API (con fallback local si falla)
  useEffect(() => {
    let alive = true;
    (async function () {
      setLoading(true);
      setErr('');
      try {
        const url = `${API}/api/products?inStock=true&limit=200`;
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const arr = Array.isArray(j) ? j : (j.items || j.products || j.data || []);
        const normalized = normalizeProducts(Array.isArray(arr) ? arr : []);
        if (alive) setRawItems(normalized);
      } catch (err1) {
        if (import.meta.env.DEV) console.warn('API fetch failed:', err1);
        // Fallback local: probar varios candidatos y usar resolveSrc para respetar BASE_URL
        const candidates = ['products.json', 'products/products.json', 'data/products.json'];
        let loaded = false;
        for (const c of candidates) {
          try {
            const path = resolveSrc('/' + c) || c;
            const r = await fetch(path, { cache: 'no-store' });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            const arr = Array.isArray(j) ? j : (j.items || []);
            const normalized = normalizeProducts(Array.isArray(arr) ? arr : []);
            if (alive) setRawItems(normalized);
            loaded = true;
            break;
          } catch (err2) {
            if (import.meta.env.DEV) console.warn('Fallback candidate failed:', c, err2);
            // intentar siguiente
          }
        }
        if (!loaded && alive) {
          setRawItems([]);
          setErr('No se pudieron cargar los productos. Revisa la ruta de products.json.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Construir tarjetas por familia+color
  const cards = useMemo(() => {
    const byColor = {};
    for (let i = 0; i < rawItems.length; i++) {
      const p = rawItems[i];
      const fam = familyFromSku(p.sku);
      const color = colorFromSkuOrName(p);

      const key = fam + '-' + color;
      if (!byColor[key]) {
        byColor[key] = {
          key,
          family: fam,
          color,
          name: niceName(p.name),
          images: [],
          variants: {},
          basePrice: p.price != null ? p.price : 0,
        };
      }
      const card = byColor[key];

      const sz = String(p.variant || 'ÚNICA').toUpperCase();
      card.variants[sz] = p;

      const imgs = Array.isArray(p.images) ? p.images : [];
      for (let k = 0; k < imgs.length; k++) {
        const raw = imgs[k];
        const src = resolveSrc(raw) || resolveSrc('/marcas.jpg');
        if (src && card.images.indexOf(src) === -1) card.images.push(src);
      }
      if (p.price != null) card.basePrice = p.price;
    }

    const out = Object.values(byColor);
    out.sort((a, b) => a.family.localeCompare(b.family) || a.color.localeCompare(b.color));
    return out;
  }, [rawItems]);

  // Selección inicial (prioriza M→L→XL con stock)
  useEffect(() => {
    if (!cards.length) return;
    const init = {};
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const present = Object.keys(card.variants || {});
      let first = '';
      for (let t = 0; t < ALL_SIZES.length; t++) {
        const sz = ALL_SIZES[t];
        if (present.includes(sz)) {
          const av = (card.variants[sz]?.available_stock) || 0;
          if (av > 0) { first = sz; break; }
        }
      }
      if (!first) {
        for (let t = 0; t < ALL_SIZES.length; t++) {
          const sz = ALL_SIZES[t];
          if (present.includes(sz)) { first = sz; break; }
        }
      }
      init[card.key] = { size: first, photo: 0 };
    }
    setSelected(prev => (Object.keys(prev).length ? prev : init));
  }, [cards]);

  function goDetail(card) {
    const sel = selected[card.key] || { size: '' };
    const item = card.variants?.[sel.size];
    const id = item ? item._id : card.key;
    navigate('/producto/' + encodeURIComponent(id));
  }
  function selectSize(card, size) {
    setSelected(s => ({ ...s, [card.key]: { ...(s[card.key] || {}), size } }));
  }
  function nextPhoto(card, e) {
    if (e) e.stopPropagation();
    setSelected(s => {
      const sel = s[card.key] || { size: '', photo: 0 };
      const imgs = Array.isArray(card.images) ? card.images : [];
      if (!imgs.length) return s;
      const p = (sel.photo + 1) % imgs.length;
      return { ...s, [card.key]: { ...sel, photo: p } };
    });
  }
  function prevPhoto(card, e) {
    if (e) e.stopPropagation();
    setSelected(s => {
      const sel = s[card.key] || { size: '', photo: 0 };
      const imgs = Array.isArray(card.images) ? card.images : [];
      if (!imgs.length) return s;
      const p = (sel.photo - 1 + imgs.length) % imgs.length;
      return { ...s, [card.key]: { ...sel, photo: p } };
    });
  }
  function handleAdd(card) {
    const sel = selected[card.key] || { size: '' };
    const item = card.variants?.[sel.size];
    if (!item) return;

    const img =
      (Array.isArray(card.images) && card.images[0]) ||
      (Array.isArray(item.images) && item.images[0]) ||
      '';

    addToCart(
      {
        _id: item._id,
        id: item._id,
        name: card.name,
        price: item.price != null ? item.price : card.basePrice,
        image: img,
      },
      1
    );
    navigate('/carrito');
  }

  return (
    <section className="product-catalog-hombre" style={{ padding: 20, textAlign: 'center' }}>
      <h2 style={{ marginBottom: 24 }}>Productos nuevos</h2>

      {loading && <p>Cargando productos…</p>}
      {!loading && err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <div className="product-list" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
          {cards.map((card) => {
            const sel = selected[card.key] || { size: '', photo: 0 };
            const gallery = Array.isArray(card.images) ? card.images : [];
            const photoIdx = sel.photo || 0;
            const photoSrc = gallery[photoIdx] || gallery[0] || '';
            const canAdd = !!(card.variants && card.variants[sel.size]);

            return (
              <article
                key={card.key}
                className="product-card"
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 12,
                  padding: 12,
                  width: 240,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div
                  style={{
                    position: 'relative', width: '100%', height: 200, background: '#fff',
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #eee',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onClick={() => goDetail(card)}
                  title="Ver detalles"
                >
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={card.name + ' ' + (card.color || '')}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = resolveSrc('/marcas.jpg') || ''; }}
                    />
                  ) : (
                    <div style={{ color: '#888' }}>Sin imagen</div>
                  )}
                  {gallery.length > 1 && (
                    <>
                      <button onClick={(e) => prevPhoto(card, e)} aria-label="Anterior" style={navBtnStyle('left')}>‹</button>
                      <button onClick={(e) => nextPhoto(card, e)} aria-label="Siguiente" style={navBtnStyle('right')}>›</button>
                    </>
                  )}
                </div>

                <h3 onClick={() => goDetail(card)} style={{ margin: '8px 0 0', fontSize: 18, cursor: 'pointer', minHeight: 44 }}>
                  {card.name}
                </h3>

                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  {currency.format(card.basePrice || 0)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <span title={card.color?.toLowerCase?.() || ''} style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '1px solid #bbb', background: COLOR_HEX[card.color] || '#ddd'
                  }} />
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  {ALL_SIZES.map((sz) => {
                    const enabled = !!(card.variants && card.variants[sz]);
                    const active = sel.size === sz && enabled;
                    return (
                      <button
                        key={sz}
                        onClick={() => enabled && selectSize(card, sz)}
                        disabled={!enabled}
                        style={{
                          minWidth: 32, height: 28, borderRadius: 8,
                          border: active ? '2px solid #222' : '1px solid #bbb',
                          background: '#fff', color: '#222', fontWeight: 600,
                          cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.45
                        }}
                        aria-label={'Talla ' + sz}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleAdd(card)}
                  disabled={!canAdd}
                  style={{
                    width: '100%', padding: '10px 12px', border: 'none',
                    borderRadius: 10, background: canAdd ? '#111' : '#999',
                    color: '#fff', fontWeight: 600, cursor: canAdd ? 'pointer' : 'not-allowed'
                  }}
                >
                  {canAdd ? 'Agregar al carrito' : 'Sin stock'}
                </button>
              </article>
            );
          })}

          {cards.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
              No hay productos disponibles por ahora.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function navBtnStyle(side) {
  const style = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 26,
    height: 36,
    borderRadius: 10,
    border: 'none',
    background: 'rgba(0,0,0,.35)',
    color: '#fff',
    lineHeight: '36px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
  };
  style[side] = 6;
  return style;
}
