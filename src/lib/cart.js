// src/lib/cart.js
// SHIM SIMPLE SIN try/catch
const CART_KEY = "cart";
const _mem = { cart: [] };

function hasLS() {
  if (typeof window === "undefined") return false;
  return !!window.localStorage;
}

function read() {
  if (!hasLS()) return _mem.cart;
  const ls = window.localStorage;
  const raw = ls.getItem(CART_KEY) || "[]";
  const arr = JSON.parse(raw); // asumimos válido porque lo escribimos nosotros
  return Array.isArray(arr) ? arr : [];
}

function write(arr) {
  const safeArr = Array.isArray(arr) ? arr : [];
  if (hasLS()) {
    const ls = window.localStorage;
    ls.setItem(CART_KEY, JSON.stringify(safeArr));
  } else {
    _mem.cart = safeArr;
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("cart-changed"));
  }
}

// === API PÚBLICA ===
export function getCart() {
  return read();
}

export function setCart(next) {
  write(Array.isArray(next) ? next : []);
}

export function clearCart() {
  write([]);
}

// Agregar al carrito (modo simple, sin reglas de combo)
export function addToCart(product, qty = 1, comboGroup = "") {
  const cart = read();
  const id = (product && (product._id || product.id || product.sku)) || null;
  if (!id) return;

  const keyGroup = comboGroup || (product && product.comboGroup) || "";
  const idx = cart.findIndex(
    (i) => i.id === id && ((i.comboGroup || "") === keyGroup)
  );

  const qtyNum = Math.max(1, Number(qty || 1));
  const priceNum = Number(product && product.price) || 0;
  const image =
    (product && (product.image || (product.images && product.images[0]))) || "";

  if (idx >= 0) {
    const prev = Number(cart[idx].qty) || 1;
    cart[idx] = { ...cart[idx], qty: Math.max(1, prev + qtyNum) };
  } else {
    cart.push({
      id,                 // puede ser _id o sku
      _id: product && product._id,
      name: (product && product.name) || "Producto",
      price: priceNum,
      qty: qtyNum,
      image,
      comboGroup: keyGroup,
    });
  }
  write(cart);
}

// Eliminar una línea específica
export function removeFromCart(id, comboGroup = "") {
  const cart = read().filter(
    (i) => !(i.id === id && ((i.comboGroup || "") === (comboGroup || "")))
  );
  write(cart);
}

// Incrementar/decrementar cantidad
export function updateQtyDelta(id, comboGroup = "", delta = 0) {
  const cart = read();
  const idx = cart.findIndex(
    (i) => i.id === id && ((i.comboGroup || "") === (comboGroup || ""))
  );
  if (idx < 0) return;
  const next = Math.max(1, (Number(cart[idx].qty) || 1) + Number(delta || 0));
  cart[idx].qty = next;
  write(cart);
}

// Borrar por grupo (si no usas combos, es inofensivo)
export function removeComboGroup(group = "") {
  const g = group || "";
  const cart = read().filter((i) => (i.comboGroup || "") !== g);
  write(cart);
}
