  // backend/routes/orders.js  (REEMPLÁZALO COMPLETO)
  const express = require('express');
  const mongoose = require('mongoose');
  const Order = require('../models/Order');
  const Product = require('../models/Product');
  const StockMovement = require('../models/StockMovement');
  const { requireAuth, requireAdmin } = require('../middleware/auth');

  const router = express.Router();

  const RESERVATION_MINUTES = 90;
  const isValidObjectId = (id) => mongoose.isValidObjectId(id || '');

  // ---------- Crear ORDEN (acepta productId | sku | name) ----------
  router.post('/', async (req, res) => {
    const { items, shipping, customer, paymentMethod } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items requeridos' });
    }

    // Validación preliminar (pero flexible)
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const hasValidId = isValidObjectId(it.productId);
      const hasSku = typeof it.sku === 'string' && it.sku.trim().length > 0;
      const hasName = typeof it.name === 'string' && it.name.trim().length > 0;
      if (!hasValidId && !hasSku && !hasName) {
        return res.status(400).json({
          message: `Item #${i + 1} debe incluir productId válido, o sku, o name`,
          item: it,
        });
      }
      if (!it.qty || Number(it.qty) <= 0) {
        return res.status(400).json({ message: `qty debe ser > 0 (item #${i + 1})` });
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000);

      const normalizedItems = [];
      const reservations = [];
      let total = 0;

      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const qty = Math.max(1, Number(it.qty || 1));

        // Resolver producto por id / sku / name (en ese orden)
        let prod = null;
        if (isValidObjectId(it.productId)) {
          prod = await Product.findById(it.productId).session(session);
        }
        // DESPUÉS (si viene variant, busca por sku + variant)
        if (!prod && it.sku) {
        const query = { sku: it.sku };
        if (typeof it.variant === 'string' && it.variant.trim()) {
        query.variant = it.variant.trim();
        }
  prod = await Product.findOne(query).session(session);
}

        if (!prod && it.name) {
          // match exacto por nombre (insensible a mayúsculas/minúsculas)
          prod = await Product.findOne({ name: new RegExp(`^${it.name.trim()}$`, 'i') }).session(session);
        }

        if (!prod) {
          throw new Error(`Producto no encontrado (item #${i + 1}). Recibido: ${JSON.stringify({
            productId: it.productId || null, sku: it.sku || null, name: it.name || null
          })}`);
        }
        if (prod.isActive === false) throw new Error(`Producto inactivo: ${prod.name}`);

        // Reserva (métodos del modelo Product)
        prod.reserve(qty);
        await prod.save({ session });

        await StockMovement.create([{
          productId: prod._id,
          type: 'reserve',
          qty: -qty,
          notes: 'Reserva por nueva orden',
        }], { session });

        reservations.push({ productId: prod._id, qty, expiresAt });
        normalizedItems.push({
          productId: prod._id,
          sku: prod.sku || null,
          variant: it.variant || null,
          qty,
          unitPrice: prod.price || 0,
        });

        total += (prod.price || 0) * qty;
      }

      const pm = String(paymentMethod || '').toLowerCase();
      const initialStatus = pm === 'contraentrega' ? 'pending_delivery' : 'pending_payment';

      const [order] = await Order.create([{
        status: initialStatus,
        items: normalizedItems,
        reservations,
        total,
        shipping: shipping || {},
        customer: customer || {},
        payment: { method: pm || null },
      }], { session });

      await session.commitTransaction();
      return res.status(201).json({ id: order._id, total });
    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ message: err.message || 'No se pudo crear la orden' });
    } finally {
      session.endSession();
    }
  });

  // ---------- Listado admin ----------
  router.get('/list', requireAuth, requireAdmin, async (req, res) => {
    try {
      const {
        status, method, q, from, to,
        page = '1', limit = '20',
        sortBy = 'createdAt', order = 'desc'
      } = req.query;

      const filters = {};
      if (status) filters.status = { $in: String(status).split(',').map(s => s.trim()).filter(Boolean) };
      if (method) filters['payment.method'] = { $in: String(method).split(',').map(s => s.trim()).filter(Boolean) };
      if (from || to) {
        filters.createdAt = {};
        if (from) filters.createdAt.$gte = new Date(from);
        if (to) filters.createdAt.$lte = new Date(to);
      }
      if (q && String(q).trim()) {
        const text = String(q).trim();
        const or = [
          { 'shipping.nombre': new RegExp(text, 'i') },
          { 'customer.nombre': new RegExp(text, 'i') },
          { 'customer.telefono': new RegExp(text, 'i') },
          { 'payment.txnId': new RegExp(text, 'i') },
        ];
        if (isValidObjectId(text)) or.push({ _id: new mongoose.Types.ObjectId(text) });
        filters.$or = or;
      }

      const pg = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const sortDir = String(order).toLowerCase() === 'asc' ? 1 : -1;

      const projection = [
        '_id','status','total','createdAt',
        'payment.method','payment.receiptUrl','payment.txnId',
        'shipping.nombre','shipping.ciudad',
        'customer.nombre','customer.telefono'
      ].join(' ');

      const [itemsList, totalCount] = await Promise.all([
        Order.find(filters, projection).sort({ [sortBy]: sortDir }).skip((pg - 1) * lim).limit(lim),
        Order.countDocuments(filters),
      ]);

      res.json({ items: itemsList, page: pg, limit: lim, total: totalCount, hasMore: pg * lim < totalCount });
    } catch (err) {
      res.status(500).json({ message: err.message || 'Error interno' });
    }
  });

  // ---------- Mark paid ----------
  router.patch('/:id/mark-paid', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { txnId, receiptUrl, method } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'orderId inválido' });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const order = await Order.findById(id).session(session);
      if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
      if (order.status !== 'pending_payment') {
        return res.status(400).json({ message: `No se puede marcar como pagada desde "${order.status}"` });
      }

      for (const it of order.items || []) {
        const prod = await Product.findById(it.productId).session(session);
        if (!prod) throw new Error(`Producto no encontrado: ${it.productId}`);
        prod.confirm(it.qty);
        await prod.save({ session });

        await StockMovement.create([{
          productId: prod._id, type: 'commit', qty: 0,
          notes: `Orden ${order._id} confirmada (pago)`,
        }], { session });
      }

      order.status = 'paid';
      order.payment = {
        ...(order.payment || {}),
        method: method || order?.payment?.method || 'manual',
        txnId: txnId || order?.payment?.txnId || null,
        receiptUrl: receiptUrl || order?.payment?.receiptUrl || null,
        paidAt: new Date(),
      };
      order.reservations = [];
      await order.save({ session });

      await session.commitTransaction();
      res.json({
        id: order._id, status: order.status, total: order.total,
        paidAt: order.payment.paidAt,
        payment: { method: order.payment.method, txnId: order.payment.txnId, receiptUrl: order.payment.receiptUrl },
      });
    } catch (err) {
      await session.abortTransaction();
      res.status(400).json({ message: err.message || 'No se pudo marcar como pagada' });
    } finally {
      session.endSession();
    }
  });

  // ---------- Mark delivered (COD) ----------
  router.patch('/:id/mark-delivered', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { txnId, receiptUrl } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'orderId inválido' });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const order = await Order.findById(id).session(session);
      if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

      const pm = String(order?.payment?.method || '').toLowerCase();
      const isCOD = pm === 'contraentrega';
      const canDeliver = order.status === 'pending_delivery' || (order.status === 'pending_payment' && isCOD);
      if (!canDeliver) return res.status(400).json({ message: `No se puede marcar como entregada desde "${order.status}"` });

      for (const it of order.items || []) {
        const prod = await Product.findById(it.productId).session(session);
        if (!prod) throw new Error(`Producto no encontrado: ${it.productId}`);
        prod.confirm(it.qty);
        await prod.save({ session });

        await StockMovement.create([{
          productId: prod._id, type: 'commit', qty: 0,
          notes: `Orden ${order._id} entregada (COD)`,
        }], { session });
      }

      order.status = 'paid';
      order.payment = {
        ...(order.payment || {}),
        method: 'contraentrega',
        txnId: txnId || order?.payment?.txnId || null,
        receiptUrl: receiptUrl || order?.payment?.receiptUrl || null,
        paidAt: new Date(),
      };
      order.reservations = [];
      await order.save({ session });

      await session.commitTransaction();
      res.json({ id: order._id, status: order.status, paidAt: order.payment.paidAt, payment: order.payment });
    } catch (err) {
      await session.abortTransaction();
      res.status(400).json({ message: err.message || 'No se pudo marcar como entregada' });
    } finally {
      session.endSession();
    }
  });

  // ---------- Not delivered ----------
  router.patch('/:id/not-delivered', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'orderId inválido' });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const order = await Order.findById(id).session(session);
      if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
      if (order.status !== 'pending_delivery') {
        return res.status(400).json({ message: `Solo aplica desde 'pending_delivery' (actual: "${order.status}")` });
      }

      for (const it of order.items || []) {
        const prod = await Product.findById(it.productId).session(session);
        if (!prod) throw new Error(`Producto no encontrado: ${it.productId}`);
        prod.release(it.qty);
        await prod.save({ session });

        await StockMovement.create([{
          productId: prod._id, type: 'unreserve', qty: it.qty,
          notes: `No entregada - devolución${reason ? ` (${reason})` : ''} (orden ${order._id})`,
        }], { session });
      }

      order.status = 'cancelled';
      order.reservations = [];
      order.cancelledAt = new Date();
      await order.save({ session });

      await session.commitTransaction();
      res.json({ id: order._id, status: order.status, cancelledAt: order.cancelledAt });
    } catch (err) {
      await session.abortTransaction();
      res.status(400).json({ message: err.message || 'No se pudo marcar como no entregada' });
    } finally {
      session.endSession();
    }
  });

  // ---------- Summary público ----------
  router.get('/:id/summary', async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'orderId inválido' });
    try {
      const order = await Order.findById(
        id,
        'status total createdAt payment.method payment.receiptUrl items shipping.nombre shipping.ciudad'
      );
      if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

      const items = (order.items || []).map(it => ({
        productId: it.productId, sku: it.sku || null, variant: it.variant || null,
        qty: it.qty, unitPrice: it.unitPrice
      }));

      res.json({
        id: order._id,
        status: order.status,
        total: order.total,
        paymentMethod: order?.payment?.method || null,
        receiptUrl: order?.payment?.receiptUrl || null,
        createdAt: order.createdAt,
        shippingTo: { nombre: order?.shipping?.nombre || null, ciudad: order?.shipping?.ciudad || null },
        items
      });
    } catch (err) {
      res.status(500).json({ message: err.message || 'Error interno' });
    }
  });

  // ---------- Get completo ----------
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'orderId inválido' });
    try {
      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
      res.json(order);
    } catch (err) {
      res.status(500).json({ message: err.message || 'Error interno' });
    }
  });

  module.exports = router;

