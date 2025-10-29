// src/pages/PayStatus.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:5000'
).replace(/\/+$/, '');

export default function PayStatus() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    try {
      setLoading(true);
      setErr('');
      setData(null);

      // 1) endpoint nuevo público
      let r = await fetch(`${API}/api/orders/${orderId}/summary`);
      // 2) compatibilidad con endpoint anterior si no existe el summary
      if (r.status === 404) r = await fetch(`${API}/api/orders/${orderId}`);

      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.message || json?.error || 'Orden no encontrada');

      // Normaliza nombre de campos para la UI
      setData({
        total: Number(json.total ?? json.amount ?? 0),
        status: json.status || 'pending_payment',
        paymentMethod: json.paymentMethod || '-',
        receiptUrl: json.receiptUrl || '',
        items: Array.isArray(json.items) ? json.items : [],
        shippingTo: json.shippingTo || json.shipping || {},
      });
    } catch (e) {
      setErr(e?.message || 'Orden no encontrada');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) return <div style={{ padding: 20 }}>Cargando…</div>;

  if (err) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Estado de pago</h2>
        <div style={{
          background:'#ffe5e5', color:'#b00020',
          padding:12, borderRadius:10, margin:'10px 0'
        }}>
          {err}
        </div>
        <button onClick={load} style={{ marginRight: 8 }}>Reintentar</button>
        <Link to="/">Volver a la tienda</Link>
      </div>
    );
  }

  const total = Number(data?.total ?? 0);
  const status = data?.status || 'pending_payment';
  const method = data?.paymentMethod || '-';
  const receiptUrl = data?.receiptUrl || '';
  const items = Array.isArray(data?.items) ? data.items : [];
  const ship = data?.shippingTo || {};

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h2>Estado de tu orden</h2>
      <div style={{ margin: '10px 0 20px', fontSize: 14, opacity: 0.8 }}>
        ID: <b>{orderId}</b> • Estado: <b>{status}</b> • Método: <b>{method}</b>
      </div>

      {receiptUrl && (
        <p>
          <b>Comprobante:</b>{' '}
          <a href={receiptUrl} target="_blank" rel="noreferrer">Abrir comprobante</a>
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        {/* Items */}
        <section style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <h3>Resumen</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((it, idx) => (
              <li key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 10,
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #eee'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {it.sku || 'SKU'} {it.variant ? `(${it.variant})` : ''} — x{it.qty || 1}
                  </div>
                </div>
                <div>${(((it.unitPrice || 0) * (it.qty || 1)) || 0).toLocaleString('es-CO')}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Totales y envío */}
        <aside style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <h3>Totales</h3>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </div>

          {(ship?.nombre || ship?.ciudad || ship?.direccion || ship?.telefono) && (
            <>
              <h3 style={{ marginTop: 20 }}>Envío</h3>
              <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                {ship.nombre && <div><b>{ship.nombre}</b></div>}
                {ship.direccion && <div>{ship.direccion}</div>}
                {ship.ciudad && <div>{ship.ciudad}</div>}
                {ship.telefono && <div>Tel: {ship.telefono}</div>}
              </div>
            </>
          )}

          <div style={{ marginTop: 20 }}>
            <Link to="/">Volver a la tienda</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
