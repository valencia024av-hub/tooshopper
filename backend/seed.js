// backend/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    if (!MONGODB_URI) {
      throw new Error('⚠️ No hay MONGODB_URI en .env');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Productos demo
    const productos = [
      {
        name: 'Camiseta básica',
        sku: 'CAMI-001',
        variant: 'M',
        price: 49900,
        available_stock: 10,
        reserved_stock: 0,
        low_stock_threshold: 2
      },
      {
        name: 'Jean slim fit',
        sku: 'JEAN-001',
        variant: '32',
        price: 89900,
        available_stock: 5,
        reserved_stock: 0,
        low_stock_threshold: 1
      },
      {
        name: 'Chaqueta deportiva',
        sku: 'CHAQ-001',
        variant: 'L',
        price: 159900,
        available_stock: 3,
        reserved_stock: 0,
        low_stock_threshold: 1
      }
    ];

    await Product.deleteMany({});
    await Product.insertMany(productos);

    console.log('🌱 Productos de prueba insertados correctamente');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

run();
