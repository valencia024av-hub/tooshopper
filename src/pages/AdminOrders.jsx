// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_LABELS = {
  pending_payment: 'Pendiente de pago',
  awaiting_verification: 'En verificación',
  pending_delivery: 'Pendiente entrega',
  paid: 'Pagada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  refunded: 'Reembolsada',
  cancelled: 'Cancelada',
};

function fmtMoney(n) {
  try { return new Intl.NumberFormat('es-CO').format(n || 0); }
  catch { return (n || 0).toLocaleString(); }
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return d; }
}
function csvEscape(value) {
  const v = value == null ? '' : String(value);
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
function downloadBlob({ content, filename, type = 'text/csv;charset=utf-8' }) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function Badge({ children, kind }) {
  const palette = {
    pending_payment: '#6b7280',
    awaiting_verification: '#2563eb',
    pending_delivery: '#f59e0b',
    paid: '#16a34a',
    rejected: '#dc2626',
    expired: '#7c3aed',
    refunded: '#0ea5e9',
    cancelled: '#374151',
  };
  return (
    <span style={{
      padding: '3px 8px',
      borderRadius: 8,
      background: '#f8f9fb',
      border: `1px solid ${palette[kind] || '#e5e7eb'}`,
      color: palette[kind] || '#111',
      fontSize: 12,
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
}

export default function AdminOrders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [q, setQ] = useState('');

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  function authHeaders() {
    const token = localStorage.getItem('token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function buildParams(custom = {}) {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterMethod) params.set('method', filterMethod);
    if (q && q.trim()) params.set('q', q.trim());
    params.set('limit', String(custom.limit ?? limit));
    params.set('order', 'desc');
    params.set('page', String(custom.page ?? page));
    return params;
  }

  async function load() {
    try {
      setErr('');
      const res = await fetch(`/api/orders/list?${buildParams().toString()}`, {
        headers: authHeaders()
      });
      const data = await res.json();

      if (res.status === 401) throw new Error('No autorizado: inicia sesión.');
      if (res.status === 403) throw new Error('Solo admin: tu cuenta no tiene permisos.');
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el listado');

      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setErr(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setActioningId('');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 8000); // auto-refresh cada 8s
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]); // recargar cuando cambie paginación

  const filteredLabel = useMemo(() => {
    const parts = [];
    if (filterStatus) parts.push(`Estado: ${filterStatus}`);
    if (filterMethod) parts.push(`Método: ${filterMethod}`);
    if (q) parts.push(`Búsqueda: "${q}"`);
    parts.push(`Página: ${page}`);
    parts.push(`Límite: ${limit}`);
    return parts.join(' · ');
  }, [filterStatus, filterMethod, q, page, limit]);

  // ---- Resumen sobre la página cargada ----
  const resumen = useMemo(() => {
    const acc = {
      totalOrdenes: items.length,
      totalMonto: items.reduce((s, it) => s + (it.total || 0), 0),
      pagadas: items.filter(it => it.status === 'paid').length,
      pendPago: items.filter(it => it.status === 'pending_payment').length,
      pendEntrega: items.filter(it => it.status === 'pending_delivery').length,
      cod: items.filter(it => String(it?.payment?.method || '').toLowerCase() === 'contraentrega').length,
    };
    return acc;
  }, [items]);

  // ---- Acciones: reglas ----
  const isCOD = (o) => String(o?.payment?.method || '').toLowerCase() === 'contraentrega';
  const canApprove = (o) => o.status === 'pending_payment' && !isCOD(o);
  const canCancel  = (o) => o.status === 'pending_payment';
  const canDeliver = (o) =>
    o.status === 'pending_delivery' ||
    (o.status === 'pending_payment' && isCOD(o));
  const canNotDelivered = (o) => o.status === 'pending_delivery' && isCOD(o);

  // ---- Acciones: llamados al backend ----
  async function markPaid(o) {
    if (!window.confirm('¿Aprobar pago y confirmar la orden?')) return;

    const defaultMethod = o?.payment?.method || 'nequi';
    const method = window.prompt('Método de pago (nequi, daviplata, contraentrega, payu, etc.)', defaultMethod);
    if (method === null) return;
    const txnId = window.prompt('ID de transacción / referencia (opcional):', o?.payment?.txnId || '') ?? '';
    const receiptUrl = window.prompt('URL del comprobante (opcional):', o?.payment?.receiptUrl || '') ?? '';

    try {
      setActioningId(o._id);
      const res = await fetch(`/api/orders/${o._id}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ method, txnId, receiptUrl })
      });
      const data = await res.json();
      if (res.status === 401) throw new Error('No autorizado: inicia sesión.');
      if (res.status === 403) throw new Error('Solo admin.');
      if (!res.ok) throw new Error(data?.error || 'No se pudo marcar como pagada');
      alert('✅ Pago aprobado');
      load();
    } catch (e) {
      alert('⚠️ ' + e.message);
      setActioningId('');
    }
  }

  async function markDelivered(o) {
    if (!window.confirm('¿Marcar ENTREGADO (contraentrega) y confirmar la orden?')) return;

    const txnId = window.prompt('ID de recibo / referencia (opcional):', o?.payment?.txnId || '') ?? '';
    const receiptUrl = window.prompt('URL del comprobante (opcional):', o?.payment?.receiptUrl || '') ?? '';

    try {
      setActioningId(o._id);
      const res = await fetch(`/api/orders/${o._id}/mark-delivered`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ txnId, receiptUrl })
      });
      const data = await res.json();
      if (res.status === 401) throw new Error('No autorizado: inicia sesión.');
      if (res.status === 403) throw new Error('Solo admin.');
      if (!res.ok) throw new Error(data?.error || 'No se pudo marcar como entregada');
      alert('📦 Orden entregada (contraentrega)');
      load();
    } catch (e) {
      alert('⚠️ ' + e.message);
      setActioningId('');
    }
  }

  async function markNotDelivered(o) {
    if (!window.confirm('¿Marcar NO RECIBIDA y devolver a inventario?')) return;

    const reason = window.prompt('Motivo (opcional: no lo encontraron, no quiso recibir, etc.)', '') ?? '';

    try {
      setActioningId(o._id);
      const res = await fetch(`/api/orders/${o._id}/not-delivered`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.status === 401) throw new Error('No autorizado: inicia sesión.');
      if (res.status === 403) throw new Error('Solo admin.');
      if (!res.ok) throw new Error(data?.error || 'No se pudo procesar la devolución');
      alert('↩️ Orden marcada como NO RECIBIDA y devuelta a inventario');
      load();
    } catch (e) {
      alert('⚠️ ' + e.message);
      setActioningId('');
    }
  }

  async function cancelOrder(o) {
    if (!window.confirm('¿Cancelar la orden y liberar las reservas?')) return;
    try {
      setActioningId(o._id);
      const res = await fetch(`/api/orders/${o._id}/cancel`, {
        method: 'PATCH',
        headers: { ...authHeaders() }
      });
      const data = await res.json();
      if (res.status === 401) throw new Error('No autorizado: inicia sesión.');
      if (res.status === 403) throw new Error('Solo admin.');
      if (!res.ok) throw new Error(data?.error || 'No se pudo cancelar la orden');
      alert('🚫 Orden cancelada y reservas liberadas');
      load();
    } catch (e) {
      alert('⚠️ ' + e.message);
      setActioningId('');
    }
  }

  // ---- Exportar CSV ----
  function rowsToCSV(rows) {
    const header = [
      'Fecha',
      'OrdenId',
      'Nombre',
      'Ciudad',
      'Telefono',
      'Metodo',
      'Estado',
      'Total',
      'ReciboURL'
    ];
    const lines = [header.map(csvEscape).join(',')];

    rows.forEach(o => {
      const cols = [
        fmtDate(o.createdAt),
        o._id,
        o.shipping?.nombre || o.customer?.nombre || '',
        o.shipping?.ciudad || '',
        o.customer?.telefono || '',
        o.payment?.method || '',
        o.status,
        (o.total ?? 0),
        o.payment?.receiptUrl || ''
      ];
      lines.push(cols.map(csvEscape).join(','));
    });

    return lines.join('\n');
  }

  function exportCSVPage() {
    const csv = rowsToCSV(items);
    const filename = `ordenes_p${page}_lim${limit}.csv`;
    downloadBlob({ content: csv, filename });
  }

  async function exportCSVAll() {
    try {
      const all = [];
      let curPage = 1;
      const lim = limit; // usa el mismo límite actual por simplicidad

      while (true) {
        const params = buildParams({ page: curPage, limit: lim });
        const res = await fetch(`/api/orders/list?${params.toString()}`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Error exportando CSV');

        (data.items || []).forEach(it => all.push(it));
        if (!data.hasMore) break;
        curPage += 1;
      }

      const csv = rowsToCSV(all);
      const filename = `ordenes_todas_${Date.now()}.csv`;
      downloadBlob({ content: csv, filename });
    } catch (e) {
      alert('⚠️ ' + (e.message || 'No se pudo exportar'));
    }
  }

  // ---- Helpers UI ----
  function setQuickStatus(v) {
    setFilterStatus(v);
    setPage(1);
    setTimeout(load, 0);
  }
  function applyFilters() {
    setPage(1);
    load();
  }

  return (
    <div style={{ maxWidth: 1100, margin: '30px auto', padding: '0 16px' }}>
      <h1>Panel de Órdenes</h1>

      {/* Resumen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10,
        margin: '10px 0 16px'
      }}>
        <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Órdenes (página)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{resumen.totalOrdenes}</div>
        </div>
        <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Total $ (página)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>${fmtMoney(resumen.totalMonto)}</div>
        </div>
        <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Pagadas</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{resumen.pagadas}</div>
        </div>
        <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Pend. pago</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{resumen.pendPago}</div>
        </div>
        <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Pend. entrega</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{resumen.pendEntrega}</div>
        </div>
        <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Contraentrega</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{resumen.cod}</div>
        </div>
      </div>

      {/* Quick filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <button onClick={() => setQuickStatus('')}>Todas</button>
        <button onClick={() => setQuickStatus('awaiting_verification')}>En verificación</button>
        <button onClick={() => setQuickStatus('pending_delivery')}>Pendiente entrega</button>
        <button onClick={() => setQuickStatus('pending_payment')}>Pendiente pago</button>
        <button onClick={() => setQuickStatus('paid')}>Pagadas</button>
      </div>

      {/* Filtros + Export */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="awaiting_verification">En verificación</option>
          <option value="pending_delivery">Pendiente entrega</option>
          <option value="pending_payment">Pendiente de pago</option>
          <option value="paid">Pagadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="expired">Expiradas</option>
          <option value="refunded">Reembolsadas</option>
          <option value="cancelled">Canceladas</option>
        </select>

        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
          <option value="">Todos los métodos</option>
          <option value="nequi">Nequi</option>
          <option value="daviplata">Daviplata</option>
          <option value="contraentrega">Contraentrega</option>
          <option value="payu">PayU</option>
        </select>

        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, teléfono, txnId, id..."
          style={{ flex: 1, minWidth: 220, padding: 8 }}
        />

        <button onClick={applyFilters} disabled={refreshing}>
          {refreshing ? 'Actualizando...' : 'Aplicar filtros'}
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={exportCSVPage} title="Exportar solo la página actual">
            Exportar CSV (página)
          </button>
          <button onClick={exportCSVAll} title="Exportar todas las páginas con filtros">
            Exportar CSV (todo)
          </button>
        </div>

        {filteredLabel && (
          <span style={{ color: '#666', fontSize: 12 }}>
            {filteredLabel}
          </span>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ padding: 20 }}>Cargando...</div>
      ) : err ? (
        <div style={{ padding: 20, color: 'crimson' }}>Error: {err}</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 20 }}>No hay órdenes con esos filtros.</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: 8 }}>Fecha</th>
                  <th style={{ padding: 8 }}>Orden</th>
                  <th style={{ padding: 8 }}>Cliente</th>
                  <th style={{ padding: 8 }}>Método</th>
                  <th style={{ padding: 8 }}>Estado</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                  <th style={{ padding: 8 }}>Recibo</th>
                  <th style={{ padding: 8 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o._id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ padding: 8 }}>
                      <code style={{ fontSize: 12 }}>{o._id}</code>
                    </td>
                    <td style={{ padding: 8 }}>
                      {(o.shipping?.nombre || o.customer?.nombre || '—')}
                      {o.shipping?.ciudad ? ` · ${o.shipping.ciudad}` : ''}
                      {o.customer?.telefono ? ` · ${o.customer.telefono}` : ''}
                    </td>
                    <td style={{ padding: 8, textTransform: 'capitalize' }}>
                      {o.payment?.method || '—'}
                    </td>
                    <td style={{ padding: 8 }}>
                      <Badge kind={o.status}>{STATUS_LABELS[o.status] || o.status}</Badge>
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>${fmtMoney(o.total)}</td>
                    <td style={{ padding: 8 }}>
                      {o.payment?.receiptUrl ? (
                        <a href={o.payment.receiptUrl} target="_blank" rel="noreferrer">
                          Abrir comprobante
                        </a>
                      ) : <span style={{ color: '#999' }}>—</span>}
                    </td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link to={`/pago/estado/${o._id}`}>Ver</Link>

                        {canApprove(o) && (
                          <button disabled={actioningId === o._id} onClick={() => markPaid(o)}>
                            {actioningId === o._id ? 'Procesando...' : 'Aprobar pago'}
                          </button>
                        )}

                        {canDeliver(o) && (
                          <button disabled={actioningId === o._id} onClick={() => markDelivered(o)}>
                            {actioningId === o._id ? 'Procesando...' : 'Marcar entregado'}
                          </button>
                        )}

                        {canNotDelivered(o) && (
                          <button disabled={actioningId === o._id} onClick={() => markNotDelivered(o)}>
                            {actioningId === o._id ? 'Procesando...' : 'No recibió / devolver a stock'}
                          </button>
                        )}

                        {canCancel(o) && (
                          <button disabled={actioningId === o._id} onClick={() => cancelOrder(o)}>
                            {actioningId === o._id ? 'Procesando...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ◀ Anterior
              </button>
              <span style={{ fontSize: 13, color: '#555' }}>
                Página {page} · Mostrando {items.length} de {total}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
              >
                Siguiente ▶
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="limitSel" style={{ fontSize: 13, color: '#555' }}>Límite:</label>
              <select
                id="limitSel"
                value={limit}
                onChange={e => { setLimit(parseInt(e.target.value, 10) || 20); setPage(1); }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button onClick={() => { setRefreshing(true); load(); }}>
                Refrescar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
