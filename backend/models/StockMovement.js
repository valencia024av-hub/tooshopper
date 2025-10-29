// backend/models/StockMovement.js
const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    // Tipos estandarizados y compatibles con tus endpoints
    // - reserve: al crear la orden (baja available, sube reserved)
    // - commit: al aprobar pago (consume la reserva; qty=0 porque inventario ya se descontó en la reserva)
    // - unreserve: al cancelar/expirar (libera reserva; sube available, baja reserved)
    // Opcionales (por si luego quieres usarlos): adjust, sale, refund
    type: {
      type: String,
      required: true,
      enum: ['reserve', 'commit', 'unreserve', 'adjust', 'sale', 'refund'],
    },
    // Puede ser negativo, positivo o 0 (por ejemplo, 0 en 'commit')
    qty: { type: Number, required: true },
    notes: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model('StockMovement', StockMovementSchema);
