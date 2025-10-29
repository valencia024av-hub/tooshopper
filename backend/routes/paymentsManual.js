// backend/routes/paymentsManual.js
const express = require('express');
const mongoose = require('mongoose');

const OrderMod = require('../models/Order');
const ProductMod = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const Order = OrderMod.default || OrderMod;
const Product = ProductMod.default || ProductMod;

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.isValidObjectId(id || '');
}

// Util: mover reservas → vendido (resta reserved_stock)
async function consumeStockForOrder(order) {
  if (Array.isArray(order.reservations) && order.reservations.length > 0) {
    for (const r of order.reservations) {
      const prod = await Product.findById(r.productId);
      if (!prod) continue;
      const current = prod.reserved_stock || 0;
      const dec = Math.min(current, r.qty || 0);
      prod.reserved_stock = Math.max(0, current - dec);
      await prod.save();
    }
    return 'reserved';
  }
  // Fallback: sin reservas → baja de available
  if (Array.isArray(order.items)) {
    for (const it of order.items) {
      const prod = await Product.findById(it.productId);
      if (!prod) continue;
      prod.available_stock = Math.max(0, (prod.available_stock || 0) - (it.qty || 1));
      await prod.save();
    }
    return 'available';
  }
  return 'none';
}

// Util: liberar reservas → vuelve a available_stock
async function releaseReservations(order) {
  if (Array.isArray(order.reservations)) {
    for (const r of order.reservations) {
      const prod = await Product.findById(r.productId);
      if (!prod) continue;
      prod.reserved_stock = Math.max(0, (prod.reserved_stock || 0) - (r.qty || 0));
      prod.available_stock = (prod.available_stock || 0) + (r.qty || 0);
      await prod.save();
    }
  }
}

// Cliente marcó "Ya pagué" / eligió método  (NO requiere admin)
router.post('/mark-awaiting', async (req, res) => {
  try {
    let { orderId, method, receiptUrl } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId requerido' });
    if (!isValidObjectId(orderId)) return res.status(400).json({ error: 'orderId inválido' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (['paid','rejected','expired','refunded'].includes(order.status)) {
      return res.status(400).json({ error: `No se puede actualizar desde estado ${order.status}` });
    }

    method = (method || order.payment?.method || 'nequi').toString().trim().toLowerCase();

    if (receiptUrl && typeof receiptUrl === 'string') {
      receiptUrl = receiptUrl.trim();
      if (receiptUrl.length > 2048) return res.status(400).json({ error: 'receiptUrl demasiado largo' });
    } else {
      receiptUrl = order.payment?.receiptUrl || null;
    }

    const nextStatus = (method === 'contraentrega') ? 'pending_delivery' : 'awaiting_verification';

    order.status = nextStatus;
    order.payment = { ...(order.payment || {}), method, receiptUrl };
    await order.save();

    res.json({ ok: true, status: order.status });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error interno' });
  }
});

// Admin confirma pago (Nequi/Daviplata): (PROTEGIDO)
router.post('/mark-paid', requireAuth, requireAdmin, async (req, res) => {
  const { orderId, txnId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId requerido' });
  if (!isValidObjectId(orderId)) return res.status(400).json({ error: 'orderId inválido' });

  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    if (order.status === 'paid') {
      return res.json({ ok: true, status: 'paid', message: 'La orden ya estaba pagada (idempotente)' });
    }
    if (!['pending_payment','awaiting_verification'].includes(order.status)) {
      throw new Error(`Estado inválido para marcar pago: ${order.status}`);
    }

    await consumeStockForOrder(order);

    order.status = 'paid';
    order.payment = {
      ...(order.payment || {}),
      txnId: txnId || order.payment?.txnId || null,
      confirmedAt: new Date()
    };
    await order.save();

    res.json({ ok: true, status: 'paid' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin marca ENTREGADO (contraentrega): (PROTEGIDO)
router.post('/mark-delivered', requireAuth, requireAdmin, async (req, res) => {
  const { orderId, txnId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId requerido' });
  if (!isValidObjectId(orderId)) return res.status(400).json({ error: 'orderId inválido' });

  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    if (order.status === 'paid') {
      return res.json({ ok: true, status: 'paid', message: 'La orden ya estaba pagada (idempotente)' });
    }
    if (order.status !== 'pending_delivery') {
      throw new Error(`Estado inválido para marcar entregado: ${order.status}`);
    }

    await consumeStockForOrder(order);

    order.status = 'paid';
    order.payment = {
      ...(order.payment || {}),
      method: 'contraentrega',
      txnId: txnId || order.payment?.txnId || null,
      confirmedAt: new Date()
    };
    await order.save();

    res.json({ ok: true, status: 'paid' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin RECHAZA pago (libera reservas): (PROTEGIDO)
router.post('/mark-rejected', requireAuth, requireAdmin, async (req, res) => {
  const { orderId, reason } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId requerido' });
  if (!isValidObjectId(orderId)) return res.status(400).json({ error: 'orderId inválido' });

  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    if (!['pending_payment','awaiting_verification'].includes(order.status)) {
      throw new Error(`Estado inválido para rechazar: ${order.status}`);
    }

    await releaseReservations(order);

    order.status = 'rejected';
    order.payment = { ...(order.payment || {}), rejectReason: reason || null };
    await order.save();

    res.json({ ok: true, status: 'rejected' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Expirar: liberar reservas (PROTEGIDO)
router.post('/expire', requireAuth, requireAdmin, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId requerido' });
  if (!isValidObjectId(orderId)) return res.status(400).json({ error: 'orderId inválido' });

  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');
    if (!['pending_payment','awaiting_verification'].includes(order.status)) {
      throw new Error(`No se puede expirar desde estado ${order.status}`);
    }

    await releaseReservations(order);

    order.status = 'expired';
    await order.save();

    res.json({ ok: true, status: 'expired' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
