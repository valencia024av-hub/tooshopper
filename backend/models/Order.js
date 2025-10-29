// backend/models/Order.js
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, default: null },
  variant: { type: String, default: null },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const ReservationSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  method: { type: String, default: null },   // nequi, daviplata, contraentrega, payu, etc.
  txnId: { type: String, default: null },
  receiptUrl: { type: String, default: null },
  paidAt: { type: Date, default: null },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'pending_payment',
      'awaiting_verification',
      'pending_delivery',
      'paid',
      'rejected',
      'expired',
      'refunded',
      'cancelled',
    ],
    default: 'pending_payment',
    index: true,
  },

  items: { type: [OrderItemSchema], default: [] },
  reservations: { type: [ReservationSchema], default: [] },

  total: { type: Number, required: true, min: 0 },

  shipping: {
    nombre: { type: String, default: null },
    ciudad: { type: String, default: null },
    direccion: { type: String, default: null },
    telefono: { type: String, default: null },
    email: { type: String, default: null },
  },

  customer: {
    nombre: { type: String, default: null },
    telefono: { type: String, default: null },
    email: { type: String, default: null },
    documento: { type: String, default: null },
  },

  payment: { type: PaymentSchema, default: {} },

  cancelledAt: { type: Date, default: null },
}, { timestamps: true });

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'payment.method': 1 });
OrderSchema.index({ 'shipping.nombre': 1 });
OrderSchema.index({ 'customer.nombre': 1 });
OrderSchema.index({ 'customer.telefono': 1 });

module.exports = mongoose.model('Order', OrderSchema);
