// src/pages/ProductDetailAC.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addToCart } from '../lib/cart';

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

// Colores visibles en los swatches
const COLOR_HEX = {
  BLANCA: '#ffffff',
  BLANCO: '#ffffff',
  AZUL: '#1f3a93',
  'AZUL OSCURO': '#0b3d91',
  NEGRA: '#000000',
  NEGRO: '#000000',
  ROJA: '#B91C1C',
  VERDE: '#0f4d2f',
  'VERDE OSCURO': '#0f4d2f',
  BEIGE: '#D6D3D1',
  GRIS: '#9CA3AF',
};
const COLOR_KEYS = Object.keys(COLOR_HEX);
const ALL_SIZES = ['S', 'M', 'L', 'XL'];

// ---------- helpers (sin optional chaining) ----------
function colorFromSkuOrName(item) {
  const sku = String(item && item.sku ? item.sku : '');
  const fromSku = sku.split('-').pop().toUpperCase();
  if (COLOR_HEX[fromSku]) return fromSku;

  const name = String(item && item.name ? item.name : '').toUpperCase();
  for (var i = 0; i < COLOR_KEYS.length; i++) {
    if (name.indexOf(COLOR_KEYS[i]) !== -1) return COLOR_KEYS[i];
  }
  return 'BLANCA';
}
function familyFromSku(sku) {
  const parts = String(sku || '').split('-');
  return parts.length >= 2
    ? (parts[0] + '-' + parts[1]).toUpperCase()
    : String(sku || '').toUpperCase();
}
function baseName(name) {
  return String(name || '').replace(/\s*\(.*?\)\s*$/, '').trim();
}
// quitar palabras de color del nombre
function stripColorWords(text) {
  var t = String(text || '');
  var re = new RegExp('\\b(' + COLOR_KEYS.join('|') + ')\\b', 'gi');
  return t.replace(re, ' ').replace(/\s{2,}/g, ' ').trim();
}

export default function ProductDetailAC() {
  const { id } = useParams(); // /producto/:id
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // selección actual
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [photo, setPhoto] = useState(0);

  // --------- Cargar productos (robusto) ----------
  useEffect(() => {
    var alive = true;
    (async function () {
      setLoading(true);

      var ok = false;
      var candidates = ['/products.json', '/products/products.json', '/data/products.json'];

      for (var i = 0; i < candidates.length; i++) {
        try {
          var r = await fetch(candidates[i], { cache: 'no-store' });
          if (!r.ok) continue;
          var j = await r.json();
          var arr = Array.isArray(j) ? j : (j && Array.isArray(j.items) ? j.items : []);
          if (arr && arr.length) {
            if (alive) setItems(arr);
            ok = true;
            break;
          }
        } catch {
          // intenta siguiente
        }
      }

      if (!ok && alive) setItems([]);
      if (alive) setLoading(false);
    })();

    return function () { alive = false; };
  }, []);

  // --------- Construir data por familia ----------
  const data = useMemo(function () {
    if (!items.length) return null;

    var idStr = String(id || '');
    var exact = items.find(function (p) { return String(p._id) === idStr; });

    var famKey = exact ? familyFromSku(exact.sku) : familyFromSku(idStr);
    var famItems = items.filter(function (p) { return familyFromSku(p.sku) === famKey; });

    if (!famItems.length) {
      // intento: prefijo de SKU
      famItems = items.filter(function (p) {
        return String(p.sku || '').toUpperCase().indexOf(idStr.toUpperCase()) === 0;
      });
      if (!famItems.length) return null;
    }

    var rawName = famItems[0] && famItems[0].name ? famItems[0].name : 'Producto';
    var name = stripColorWords(baseName(rawName)); // <<— título sin color
    var colors = {}; // { [color]: { variants: { [size]: item }, images: [] } }
    var price = 0;

    for (var i = 0; i < famItems.length; i++) {
      var p = famItems[i];
      var c = colorFromSkuOrName(p);
      var sz = String(p.variant || 'ÚNICA').toUpperCase();
      if (!colors[c]) colors[c] = { variants: {}, images: [] };

      colors[c].variants[sz] = p;
      price = p.price != null ? p.price : price;

      var imgs = Array.isArray(p.images) ? p.images : [];
      for (var k = 0; k < imgs.length; k++) {
        var src = imgs[k];
        if (src && colors[c].images.indexOf(src) === -1) colors[c].images.push(src);
      }
    }

    // selección inicial
    var initColor = Object.keys(colors)[0] || '';
    var initSize = '';

    if (exact) {
      initColor = colorFromSkuOrName(exact);
      initSize  = String(exact.variant || 'ÚNICA').toUpperCase();
    } else if (initColor) {
      var sizes = Object.keys(colors[initColor] ? colors[initColor].variants : {});
      if (sizes.length) {
        initSize = sizes[0];
        for (var s = 0; s < sizes.length; s++) {
          var key = sizes[s];
          var av = (colors[initColor].variants[key] && colors[initColor].variants[key].available_stock) || 0;
          if (av > 0) { initSize = key; break; }
        }
      }
    }

    return { name: name, price: price, colors: colors, initColor: initColor, initSize: initSize };
  }, [items, id]);

  // Fijar selección inicial (sin warning)
  useEffect(function () {
    if (!data) return;
    setPhoto(0);
    setColor(function (prev) { return prev || (data.initColor || ''); });
    setSize(function (prev)  { return prev  || (data.initSize  || ''); });
  }, [data]);

  if (loading) return <section style={{ padding: 24 }}>Cargando…</section>;
  if (!data)  return <section style={{ padding: 24 }}>Producto no encontrado.</section>;

  var colorData = (data.colors && data.colors[color]) || { variants: {}, images: [] };
  var current = (colorData.variants && colorData.variants[size]) || null;
  var images = (Array.isArray(colorData.images) && colorData.images.length)
    ? colorData.images
    : (current && Array.isArray(current.images) ? current.images : []);
  var canAdd = !!current;

  function onColorChange(c) {
    setColor(c);
    var sizes = Object.keys(data.colors[c] ? data.colors[c].variants : {});
    var first = sizes.length ? sizes[0] : '';
    for (var i = 0; i < sizes.length; i++) {
      var key = sizes[i];
      var av = (data.colors[c].variants[key] && data.colors[c].variants[key].available_stock) || 0;
      if (av > 0) { first = key; break; }
    }
    setSize(first);
    setPhoto(0);
  }
  function onSizeChange(s) {
    setSize(s);
  }
  function add() {
    if (!current) return;
    var img = images[0] || (Array.isArray(current.images) ? current.images[0] : '') || '';
    addToCart(
      { _id: current._id, id: current._id, name: data.name, price: (current.price != null ? current.price : (data.price || 0)), image: img },
      1
    );
    navigate('/carrito');
  }

  // ===== UI =====
  return (
    <section style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 420px', gap: 16 }}>
        {/* Thumbs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {images.map(function (src, i) {
            return (
              <button
                key={src + i}
                onClick={function () { setPhoto(i); }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 10,
                  border: i === photo ? '2px solid #111' : '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  boxSizing: 'border-box'
                }}
                aria-label={'Ver imagen ' + (i + 1)}
              >
                <img
                  src={src}
                  alt={'Vista ' + (i + 1)}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', objectPosition: 'center' }}
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>

        {/* Imagen principal (se adapta al alto de la pantalla) */}
        <div
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            background: '#fff',
            minHeight: 520,
            maxHeight: 'calc(100vh - 220px)',
            border: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {images[photo] ? (
            <img
              src={images[photo]}
              alt={(data.name + ' ' + (color || ''))}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          ) : (
            <div style={{ height: 520 }} />
          )}
        </div>

        {/* Panel derecho */}
        <div>
          <h1 style={{ margin: '8px 0 6px', fontSize: 24 }}>{data.name}</h1>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
            {currency.format(current && current.price != null ? current.price : (data.price || 0))}
          </div>

          {/* Colores */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Color</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(data.colors).map(function (c) {
                return (
                  <button
                    key={c}
                    onClick={function () { onColorChange(c); }}
                    title={c.toLowerCase()}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: c === color ? '2px solid #111' : '1px solid #bbb',
                      background: COLOR_HEX[c] || '#ddd',
                      cursor: 'pointer'
                    }}
                    aria-label={'Color ' + c}
                  />
                );
              })}
            </div>
          </div>

          {/* Tallas */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Talla</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_SIZES.map(function (sz) {
                var enabled = !!(colorData.variants && colorData.variants[sz]);
                var active = sz === size && enabled;
                return (
                  <button
                    key={sz}
                    onClick={function () { if (enabled) onSizeChange(sz); }}
                    disabled={!enabled}
                    style={{
                      minWidth: 36,
                      height: 32,
                      borderRadius: 8,
                      border: active ? '2px solid #111' : '1px solid #bbb',
                      background: '#fff',
                      fontWeight: 600,
                      cursor: enabled ? 'pointer' : 'not-allowed',
                      opacity: enabled ? 1 : 0.5
                    }}
                    aria-label={'Talla ' + sz}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={add}
            disabled={!canAdd}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              borderRadius: 10,
              background: canAdd ? '#111' : '#999',
              color: '#fff',
              fontWeight: 700,
              cursor: canAdd ? 'pointer' : 'not-allowed',
              marginBottom: 16
            }}
          >
            {canAdd ? 'Agregar al carrito' : 'Sin stock'}
          </button>

          {/* Descripción (fijo) */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Descripción</div>
            <div style={{ padding: '2px 0', color: '#333' }}>
              Camiseta tipo polo de algodón suave. Corte clásico. Ideal para uso diario.
            </div>
          </div>

          {/* Información del producto (fijo) */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Información del producto</div>
            <ul style={{ padding: '0 18px', margin: 0, color: '#333' }}>
              <li>Composición: 100% algodón</li>
              <li>Cuidados: lavar a máquina en frío</li>
              <li>Hecho en Colombia</li>
              <li>Familia: {Object.keys(data.colors)[0] || '—'}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
