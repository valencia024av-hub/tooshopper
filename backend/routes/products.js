// backend/routes/products.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs/promises');
const Product = require('../models/Product');

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.isValidObjectId(id || '');
}

// ===== Raíz de archivos públicos (FRONT) =====
// Recomendado en .env del backend:
// PUBLIC_DIR=C:\ARMANDO\PaginaWeb\tienda-vite\public
const PUBLIC_ROOT_CANDIDATES = [
  process.env.PUBLIC_DIR,
  path.resolve(__dirname, '..', '..', 'tienda-vite', 'public'),
  path.resolve(__dirname, '..', 'public'),
].filter(Boolean);

async function pickPublicRoot() {
  for (const root of PUBLIC_ROOT_CANDIDATES) {
    try {
      const st = await fs.stat(root);
      if (st.isDirectory()) return root;
    } catch (_) {}
  }
  return null;
}

function normalizeUrlPath(p) {
  const s = String(p || '').replace(/\\/g, '/');
  return s.startsWith('/') ? s : `/${s}`;
}

// ¿tiene extensión?
function hasExt(p) {
  return /\.[a-z0-9]{2,5}$/i.test(p || '');
}

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

// puntuación para ordenar (frente > atrás > detalle > doblada)
function scoreName(name) {
  const n = name.toLowerCase();
  if (/(front|frente|delan)/.test(n)) return 0;
  if (/(back|atr[aá]s|espalda)/.test(n)) return 1;
  if (/(detail|detalle|logo|tag|etiquet)/.test(n)) return 2;
  if (/(folded|doblada)/.test(n)) return 3;
  const m = n.match(/(\d+)/);
  if (m) return 10 + Number(m[1]);
  return 50;
}

// Expande una carpeta a archivos. Soporta filtro por query (?color=Blanca | ?match=Azul|Negra)
async function expandDir(urlWithOptionalQuery) {
  const raw = String(urlWithOptionalQuery || '');
  const [urlPathOnly, queryStr = ''] = raw.split('?');
  const params = new URLSearchParams(queryStr);
  const matchRaw = params.get('color') || params.get('match') || params.get('pattern') || '';
  const filters = matchRaw
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase());

  const urlPath = normalizeUrlPath(urlPathOnly).replace(/\/+$/, '');
  const root = await pickPublicRoot();
  if (!root) return [];

  const fullDir = path.join(root, urlPath.replace(/^\//, ''));
  try {
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => IMAGE_EXTS.has(path.extname(name).toLowerCase()))
      .filter(name => {
        if (!filters.length) return true;
        const low = name.toLowerCase();
        return filters.some(f => low.includes(f));
      })
      .sort((a, b) => scoreName(a) - scoreName(b))
      .map(name => normalizeUrlPath(path.posix.join(urlPath.replace(/^\//, ''), name)));

    return files;
  } catch (_) {
    return [];
  }
}

async function inflateImages(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const expanded = [];
  for (const v of images) {
    const val = String(v || '');
    if (!hasExt(val)) {
      // es carpeta (posible ?color=...)
      const list = await expandDir(val);
      expanded.push(...list);
    } else {
      expanded.push(normalizeUrlPath(val));
    }
  }
  if (expanded.length) {
    item.images = expanded;
    item.coverImage = expanded[0];
  }
  return item;
}

// Campos base y sort
const BASE_FIELDS = [
  'name','sku','variant','price','images',
  'available_stock','reserved_stock','isActive','createdAt','updatedAt',
].join(' ');

const SORT_WHITELIST = new Set([
  'createdAt','-createdAt','price','-price','name','-name','available_stock','-available_stock',
]);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { q, sku, variant, active = 'true', inStock, limit = 20, page = 1, sort = '-createdAt' } = req.query;
    const query = {};

    if (active === 'true') query.isActive = { $ne: false };
    if (active === 'false') query.isActive = false;

    if (typeof q === 'string' && q.trim()) {
      const text = q.trim();
      query.$or = [{ name: new RegExp(text, 'i') }, { sku: new RegExp(text, 'i') }];
    }
    if (typeof sku === 'string' && sku.trim()) query.sku = sku.trim();
    if (typeof variant === 'string' && variant.trim()) query.variant = variant.trim();
    if (inStock === 'true') query.available_stock = { $gt: 0 };

    const lim = Math.min(parseInt(limit, 10) || 20, 100);
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const sortParam = SORT_WHITELIST.has(sort) ? sort : '-createdAt';

    let items = await Product.find(query, BASE_FIELDS)
      .sort(sortParam)
      .skip((pg - 1) * lim)
      .limit(lim)
      .lean({ virtuals: true });

    items = await Promise.all(items.map(inflateImages));
    const total = await Product.countDocuments(query);

    res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error interno' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: 'productId inválido' });
  try {
    let prod = await Product.findById(id, BASE_FIELDS).lean({ virtuals: true });
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    prod = await inflateImages(prod);
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error interno' });
  }
});

module.exports = router;
