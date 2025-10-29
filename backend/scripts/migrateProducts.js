// backend/scripts/migrateProducts.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const SIZES = ['M', 'L', 'XL'];
const DEFAULT_STOCK = 10;

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Falta MONGODB_URI en .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // Leemos los docs existentes tal cual estén ahora
  const raw = await mongoose.connection.db.collection('products').find({}).toArray();
  console.log(`Productos encontrados: ${raw.length}`);

  for (const doc of raw) {
    for (const size of SIZES) {
      // upsert por (sku, variant) → idempotente
      await Product.updateOne(
        { sku: doc.sku, variant: size },
        {
          $setOnInsert: {
            name: doc.name,
            price: doc.price || 0,
            images: Array.isArray(doc.images) ? doc.images : [],
            available_stock: DEFAULT_STOCK,
            reserved_stock: 0,
            low_stock_threshold: 2,
            isActive: true,
          },
        },
        { upsert: true }
      );
    }

    // Desactiva el doc original (el “viejo” sin variant / con array variants)
    await mongoose.connection.db
      .collection('products')
      .updateOne({ _id: doc._id }, { $set: { isActive: false } });
  }

  console.log('✅ Migración terminada. Variantes M/L/XL con stock 10 creadas/aseguradas.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Error en migración:', e);
  process.exit(1);
});
