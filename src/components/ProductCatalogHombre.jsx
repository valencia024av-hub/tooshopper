// src/components/ProductCatalogHombre.jsx
import { useEffect, useMemo, useState } from 'react';
import './ProductCatalogHombre.css';
import { addToCart } from '../lib/cart';
import { useNavigate } from 'react-router-dom';

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

// Mapa de colores visibles en swatches (+ sinónimos)
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
const ALL_SIZES = ['S', 'M', 'L', 'XL'];

// 🔧 alturas mínimas para nivelar todas las tarjetas (soluciona Boss Básica)
const SWATCH_ROW_MIN_HEIGHT = 24; // fila de colores
const SIZE_ROW_MIN_HEIGHT = 36;   // fila de tallas

// ----------------- helpers -----------------
function colorFromSkuOrName(item) {
  const sku = String(item?.sku || '');
  const fromSku = sku.split('-').pop().toUpperCase();
  if (COLOR_HEX[fromSku]) return fromSku;

  const name = String(item?.name || '').toUpperCase();
  for (const w of COLOR_WORDS) if (name.includes(w)) return w;
  return 'BLANCA';
}
function familyFromSku(sku) {
  const parts = String(sku || '').split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}`.toUpperCase() : String(sku || '').toUpperCase();
}
function stripParen(text) {
  return String(text || '').replace(/\s*\(.*?\)\s*$/, '').trim();
}
function stripColorWords(text) {
  const re = new RegExp(`\\b(${COLOR_WORDS.join('|')})\\b`, 'gi');
  return String(text || '').replace(re, ' ').replace(/\s{2,}/g, ' ').trim();
}
function niceName(name) {
  return stripColorWords(stripParen(name));
}

// ----------------- componente -----------------
export default function ProductCatalogHombre() {
  const navigate = useNavigate();

  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState({}); // { [family]: { color, size, photo } }

  async function loadProducts(signal) {
    setLoading(true);
    setErr('');
    const candidates = ['/products.json', '/products/products.json', '/data/products.json'];
    let ok = false;
    for (const url of candidates) {
      try {
        const r = await fetch(url, { cache: 'no-store', signal });
        if (!r.ok) continue;
        const j = await r.json();
        const arr = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
        if (!arr?.length) continue;
        setRawItems(arr);
        ok = true;
        break;
      } catch { /* intenta el siguiente */ }
    }
    if (!ok) {
      setRawItems([]);
      setErr('No se pudieron cargar los productos. Revisa la ruta de products.json.');
    }
    setLoading(false);
  }

  useEffect(() => {
    const ac = new AbortController();
    loadProducts(ac.signal);
    return () => ac.abort();
  }, []);

  const families = useMemo(() => {
    const map = {};
    for (const p of rawItems) {
      const fam = familyFromSku(p.sku);
      const colorKey = colorFromSkuOrName(p);
      const sizeKey = String(p.variant || 'ÚNICA').toUpperCase();

      if (!map[fam]) {
        map[fam] = { family: fam, name: niceName(p.name), price: p.price ?? 0, colors: {} };
      }
      if (!map[fam].colors[colorKey]) {
        map[fam].colors[colorKey] = { variants: {}, images: [] };
      }

      map[fam].colors[colorKey].variants[sizeKey] = {
        _id: p._id || `${p.sku}-${sizeKey}`,
        name: p.name,
        price: p.price ?? 0,
        images: Array.isArray(p.images) ? p.images : [],
        available_stock: p.available_stock ?? 0,
      };

      const imgs = Array.isArray(p.images) ? p.images : [];
      for (const src of imgs) {
        const list = map[fam].colors[colorKey].images;
        if (src && !list.includes(src)) list.push(src);
      }
    }

    // selección inicial
    const initial = {};
    for (const fam of Object.keys(map)) {
      const colorKeys = Object.keys(map[fam].colors);
      if (!colorKeys.length) continue;
      const firstColor = colorKeys[0];
      const sizeKeys = Object.keys(map[fam].colors[firstColor].variants);
      let firstSize = sizeKeys[0] || '';
      for (const s of sizeKeys) {
        if ((map[fam].colors[firstColor].variants[s]?.available_stock ?? 0) > 0) { firstSize = s; break; }
      }
      initial[fam] = { color: firstColor, size: firstSize, photo: 0 };
    }
    setSelected(prev => (Object.keys(prev).length ? prev : initial));
    return map;
  }, [rawItems]);

  function getSelectedItem(fam) {
    const sel = selected[fam];
    const famData = families[fam];
    const cData = famData && sel ? famData.colors[sel.color] : null;
    return cData?.variants ? cData.variants[sel.size] : null;
  }
  function goDetail(fam) {
    const item = getSelectedItem(fam);
    const id = item?._id || fam;
    navigate('/producto/' + encodeURIComponent(id));
  }

  function selectColor(fam, color) {
    const famData = families[fam];
    if (!famData) return;
    const cData = famData.colors[color];
    const sizeKeys = cData ? Object.keys(cData.variants || {}) : [];
    let firstSize = sizeKeys[0] || '';
    for (const s of sizeKeys) {
      if ((cData.variants[s]?.available_stock ?? 0) > 0) { firstSize = s; break; }
    }
    setSelected(s => ({ ...s, [fam]: { color, size: firstSize, photo: 0 } }));
  }
  function selectSize(fam, size) {
    setSelected(s => ({ ...s, [fam]: { ...(s[fam] || {}), size } }));
  }
  function nextPhoto(fam, e) {
    if (e) e.stopPropagation();
    setSelected(s => {
      const sel = s[fam]; if (!sel) return s;
      const imgs = families[fam]?.colors?.[sel.color]?.images || [];
      if (!imgs.length) return s;
      const photo = (sel.photo + 1) % imgs.length;
      return { ...s, [fam]: { ...sel, photo } };
    });
  }
  function prevPhoto(fam, e) {
    if (e) e.stopPropagation();
    setSelected(s => {
      const sel = s[fam]; if (!sel) return s;
      const imgs = families[fam]?.colors?.[sel.color]?.images || [];
      if (!imgs.length) return s;
      const photo = (sel.photo - 1 + imgs.length) % imgs.length;
      return { ...s, [fam]: { ...sel, photo } };
    });
  }

  function handleAdd(fam) {
    const sel = selected[fam];
    const famData = families[fam];
    if (!sel || !famData) return;

    const colorData = famData.colors?.[sel.color];
    const item = colorData?.variants?.[sel.size];
    if (!item) return;

    const imgList = (Array.isArray(colorData?.images) && colorData.images.length)
      ? colorData.images
      : (Array.isArray(item.images) ? item.images : []);
    const img = imgList[0] || '';

    addToCart(
      { _id: item._id, id: item._id, name: famData.name, price: item.price ?? famData.price, image: img },
      1
    );
    navigate('/carrito');
  }

  // 👉 orden: LACOSTE-POLO (1) → BOSS-FRANJA (2) → BUNNY-POLO (3) → resto (10) → BOSS-BASICA (99, al final)
const famKeysSorted = Object.keys(families).sort((a, b) => {
  const rank = (key) => {
    const k = key.toUpperCase();
    if (k.startsWith('LACOSTE-POLO')) return 1;
    if (k.startsWith('BOSS-FRANJA'))  return 2;
    if (k.startsWith('BUNNY-POLO'))   return 3;
    if (k.startsWith('BOSS-BASICA'))  return 99; // 👈 SIEMPRE al final
    return 10; // resto
  };
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;

  // Empate: orden alfabético por nombre visible
  const na = families[a]?.name || a;
  const nb = families[b]?.name || b;
  return na.localeCompare(nb, 'es');
});


  return (
    <section className="product-catalog-hombre" style={{ padding: 20, textAlign: 'center' }}>
      <h2 style={{ marginBottom: 24 }}>Hombre</h2>

      {loading && <p>Cargando productos…</p>}
      {!loading && err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <div className="product-list" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
          {famKeysSorted.map((fam) => {
            const famData = families[fam];
            const sel = selected[fam] || {};
            const colorData = famData?.colors?.[sel.color] || { variants: {}, images: [] };

            const gallery  = colorData.images || [];
            const photoIdx = sel.photo || 0;
            const photoSrc = gallery[photoIdx] || gallery[0] || '';

            return (
              <article
                key={fam}
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
                {/* BLOQUE con gap fijo: imagen → nombre → precio → colores → tallas → CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 230,
                      background: '#fff',
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      padding: 8,
                      boxSizing: 'border-box',
                      border: '1px solid #eee'
                    }}
                    onClick={() => goDetail(fam)}
                    title="Ver detalles"
                  >
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={`${famData?.name || ''} ${sel.color || ''}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ color: '#888', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Sin imagen
                      </div>
                    )}

                    {gallery.length > 1 && (
                      <>
                        <button onClick={(e) => prevPhoto(fam, e)} aria-label="Anterior" style={navBtnStyle('left')}>‹</button>
                        <button onClick={(e) => nextPhoto(fam, e)} aria-label="Siguiente" style={navBtnStyle('right')}>›</button>
                      </>
                    )}
                  </div>

                  <h3 onClick={() => goDetail(fam)} style={{ margin: '4px 0 0', fontSize: 18, cursor: 'pointer', minHeight: 44 }}>
                    {famData?.name || ''}
                  </h3>

                  <div style={{ fontWeight: 700 }}>
                    {currency.format(colorData.variants?.[sel.size]?.price ?? famData?.price ?? 0)}
                  </div>

                  {/* Fila de colores con altura fija */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', minHeight: SWATCH_ROW_MIN_HEIGHT, alignItems: 'center' }}>
                    {Object.keys(famData?.colors || {}).map((c) => (
                      <button
                        key={c}
                        title={c.toLowerCase()}
                        onClick={() => selectColor(fam, c)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', padding: 0,
                          border: sel.color === c ? '2px solid #222' : '1px solid #bbb',
                          background: COLOR_HEX[c] || '#ddd', cursor: 'pointer'
                        }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>

                  {/* Fila de tallas con altura fija → el botón queda a la misma distancia en TODAS */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', minHeight: SIZE_ROW_MIN_HEIGHT, alignItems: 'center' }}>
                    {ALL_SIZES.map((sz) => {
                      const enabled = !!colorData.variants?.[sz];
                      const active = sel.size === sz && enabled;
                      return (
                        <button
                          key={sz}
                          onClick={() => enabled && selectSize(fam, sz)}
                          disabled={!enabled}
                          style={{
                            minWidth: 32, height: 28, borderRadius: 8,
                            border: active ? '2px solid #222' : '1px solid #bbb',
                            background: '#fff', color: '#222', fontWeight: 600,
                            cursor: enabled ? 'pointer' : 'not-allowed',
                            opacity: enabled ? 1 : 0.45
                          }}
                          aria-label={`Talla ${sz}`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>

                  {/* CTA dentro del mismo bloque (gap uniforme) */}
                  <button
                    onClick={() => handleAdd(fam)}
                    disabled={!getSelectedItem(fam)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      borderRadius: 10,
                      background: getSelectedItem(fam) ? '#111' : '#999',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: getSelectedItem(fam) ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {getSelectedItem(fam) ? 'Agregar al carrito' : 'Sin stock'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Flechas “píldora”
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
  };
  style[side] = 6;
  return style;
}
 