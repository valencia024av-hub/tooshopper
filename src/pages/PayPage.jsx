// src/pages/PayPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

// Centavos únicos a partir del id (para que coincida con lo que se paga en Nequi/Daviplata)
function uniqueCentsFromId(id) {
  if (!id) return '00';
  const hex = id.toString().slice(-2);
  const num = parseInt(hex, 16) % 100;
  return num.toString().padStart(2, '0');
}

export default function PayPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // método de pago seleccionado: 'nequi' | 'daviplata' | 'contraentrega'
  const [method, setMethod] = useState('nequi');

  // URL del comprobante (enlace oficial compartido desde la app)
  const [receiptUrl, setReceiptUrl] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/orders/${orderId}/summary`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || data?.error || 'Orden no encontrada');
        setOrder(data);
      } catch (e) {
        console.error('Error cargando resumen de orden:', e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;
  if (!order) return <div style={{ padding: 20 }}>Orden no encontrada.</div>;

  // Total mostrado con separador de miles + centavos únicos
  const cents = uniqueCentsFromId(orderId);
  const totalCOP = (order.total ?? 0).toLocaleString('es-CO');
  const totalConCentavos = `${totalCOP},${cents}`;

  async function confirmarPago() {
    try {
      setSending(true);

      // Endpoint de “pago manual en revisión” (ya existe en tu backend)
      const res = await fetch(`${API}/api/payments/manual/mark-awaiting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          method,                // 'nequi' | 'daviplata' | 'contraentrega'
          receiptUrl: receiptUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo registrar el pago');

      const okMsg =
        method === 'contraentrega'
          ? '🚚 Tu pedido quedó para PAGO CONTRAENTREGA. Te contactaremos para coordinar entrega.'
          : '✅ Recibimos tu comprobante. Tu pago está en revisión.';

      alert(okMsg);
      navigate(`/pago/estado/${orderId}`);
    } catch (e) {
      alert('⚠️ Error: ' + (e?.message || 'No se pudo registrar el pago'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '30px auto', padding: '0 16px' }}>
      <h1>Revisar y pagar</h1>
      <p><b>Orden:</b> {orderId}</p>
      <p><b>Total a pagar:</b> ${totalConCentavos}</p>

      {/* Selector de método */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button
          onClick={() => setMethod('nequi')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: method === 'nequi' ? '2px solid #111' : '1px solid #ddd',
            background: method === 'nequi' ? '#f4f4f4' : '#fff',
            cursor: 'pointer'
          }}
        >
          Nequi
        </button>
        <button
          onClick={() => setMethod('daviplata')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: method === 'daviplata' ? '2px solid #111' : '1px solid #ddd',
            background: method === 'daviplata' ? '#f4f4f4' : '#fff',
            cursor: 'pointer'
          }}
        >
          Daviplata
        </button>
        <button
          onClick={() => setMethod('contraentrega')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: method === 'contraentrega' ? '2px solid #111' : '1px solid #ddd',
            background: method === 'contraentrega' ? '#f4f4f4' : '#fff',
            cursor: 'pointer'
          }}
        >
          Contraentrega
        </button>
      </div>

      {/* Instrucciones dinámicas */}
      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
        {method === 'nequi' && (
          <>
            <h3>Pago por Nequi</h3>
            <ol>
              <li>Envía <b>${totalConCentavos}</b> a <b>Nequi: 3XX XXX XXXX</b> (Titular: <b>Tu Negocio</b>).</li>
              <li>En la referencia del pago escribe: <b>{orderId}</b>.</li>
              <li>Después de pagar, en el comprobante toca <b>Compartir → Copiar enlace</b> y pégalo abajo.</li>
            </ol>
            <div style={{ marginTop: 10 }}>
              <label>Enlace del comprobante:</label>
              <input
                value={receiptUrl}
                onChange={e => setReceiptUrl(e.target.value)}
                placeholder="Pega aquí el link del comprobante"
                style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
              />
            </div>
          </>
        )}

        {method === 'daviplata' && (
          <>
            <h3>Pago por Daviplata</h3>
            <ol>
              <li>Envía <b>${totalConCentavos}</b> a <b>Daviplata: 3XX XXX XXXX</b> (Titular: <b>Tu Negocio</b>).</li>
              <li>Referencia del pago: <b>{orderId}</b>.</li>
              <li>Comparte el comprobante → <b>Copiar enlace</b> y pégalo abajo.</li>
            </ol>
            <div style={{ marginTop: 10 }}>
              <label>Enlace del comprobante:</label>
              <input
                value={receiptUrl}
                onChange={e => setReceiptUrl(e.target.value)}
                placeholder="Pega aquí el link del comprobante"
                style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
              />
            </div>
          </>
        )}

        {method === 'contraentrega' && (
          <>
            <h3>Pago contraentrega</h3>
            <p>
              Recibirás tu pedido y pagas al momento de la entrega. Te contactaremos para coordinar envío.
              Conserva el número de orden: <b>{orderId}</b>.
            </p>
          </>
        )}

        <button
          onClick={confirmarPago}
          disabled={sending}
          style={{ marginTop: 12, padding: '10px 16px' }}
        >
          {method === 'contraentrega'
            ? (sending ? 'Registrando...' : 'Confirmar contraentrega')
            : (sending ? 'Enviando...' : 'Ya pagué')}
        </button>
      </div>

      {/* Resumen del pedido */}
      <div style={{ marginTop: 20 }}>
        <h3>Resumen de tu pedido</h3>
        <ul>
          {order.items?.map((it, idx) => (
            <li key={idx}>
              {(it.sku || 'SKU')} — x{it.qty} → ${((it.unitPrice || 0) * (it.qty || 1)).toLocaleString('es-CO')}
            </li>
          ))}
        </ul>
        <p><b>Envío a:</b> {order.shippingTo?.nombre}, {order.shippingTo?.ciudad}</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Link to="/">← Seguir comprando</Link>
        <Link to={`/pago/estado/${orderId}`}>Ver estado del pago</Link>
      </div>
    </div>
  );
}
