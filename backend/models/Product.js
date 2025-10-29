// backend/models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Básicos
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },   // requerido para poder hacer único con variant
  variant: { type: String, trim: true, default: '' },  // talla/color si aplica (ej: "M", "L", "M-Azul")

  price: { type: Number, required: true, min: 0 },

  // Imágenes (rutas públicas, p. ej. "/img/products/SKU/front.jpg")
  images: {
    type: [String],
    default: [],
    validate: {
      validator: arr => arr.every(p => typeof p === 'string' && p.length <= 1024),
      message: 'Cada ruta de imagen debe ser un string válido.'
    }
  },

  // Inventario con reserva
  available_stock: { type: Number, required: true, default: 0, min: 0 },
  reserved_stock: { type: Number, required: true, default: 0, min: 0 },

  low_stock_threshold: { type: Number, default: 0, min: 0 },

  // Estado
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// --------- Índices ---------
ProductSchema.index({ name: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ sku: 1, variant: 1 }, { unique: true }); // evita duplicados del mismo SKU+variante

// --------- Virtuales útiles ---------
ProductSchema.virtual('in_stock').get(function () {
  return this.available_stock > 0;
});

ProductSchema.virtual('coverImage').get(function () {
  return this.images?.[0] || null;
});

// --------- Métodos de stock (reservar / liberar / confirmar) ---------
ProductSchema.methods.reserve = function (qty = 1) {
  if (qty <= 0) throw new Error('Cantidad inválida para reservar.');
  if (this.available_stock < qty) throw new Error('Stock insuficiente para reservar.');
  this.available_stock -= qty;
  this.reserved_stock += qty;
  return this;
};

ProductSchema.methods.release = function (qty = 1) {
  if (qty <= 0) throw new Error('Cantidad inválida para liberar.');
  if (this.reserved_stock < qty) throw new Error('Reservas insuficientes para liberar.');
  this.reserved_stock -= qty;
  this.available_stock += qty;
  return this;
};

ProductSchema.methods.confirm = function (qty = 1) {
  // Se llama cuando el pago quedó exitoso: descuenta de reservado.
  if (qty <= 0) throw new Error('Cantidad inválida para confirmar.');
  if (this.reserved_stock < qty) throw new Error('Reservas insuficientes para confirmar.');
  this.reserved_stock -= qty;
  return this;
};

module.exports = mongoose.model('Product', ProductSchema);
