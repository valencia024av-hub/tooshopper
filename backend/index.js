// backend/index.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');

const app = express();

// ---- CORS ----
const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  credentials: true,
}));

// ---- Parsers / util ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ---- Estáticos opcionales del backend ----
const STATIC_DIR = path.join(__dirname, 'public');
app.use('/static', express.static(STATIC_DIR, { maxAge: '1d', index: false }));

// ---- Healthcheck ----
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend vivo ✅' });
});

// ---- Rutas reales (¡sin checkout en memoria!) ----
try { app.use('/api/auth', require('./routes/auth')); } catch {}
try { app.use('/api/products', require('./routes/products')); } catch {}
try { app.use('/api/orders', require('./routes/orders')); } catch {}
try { app.use('/api/payments/manual', require('./routes/paymentsManual')); } catch {}

// ---- 404 API ----
app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno' });
});

// ---- Conexión y arranque ----
const MONGODB_URI = process.env.MONGODB_URI || '';
function startServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`));
}

(async () => {
  if (!MONGODB_URI) {
    console.warn('⚠️  No hay MONGODB_URI en .env. Arranco sin BD...');
    startServer();
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    console.error('ℹ️  Arranco el servidor para depurar endpoints.');
  } finally {
    startServer();
  }
})();

// ---- Logs globales ----
process.on('unhandledRejection', (reason) => console.error('UnhandledRejection:', reason));
process.on('uncaughtException', (err) => console.error('UncaughtException:', err));
