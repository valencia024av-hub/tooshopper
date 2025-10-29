// src/lib/orders.js
import { api } from '../services/api';

function mapCartItems(cartItems = []) {
  return cartItems.map(it => ({
    // intenta distintos posibles nombres que pueda tener tu item
    sku: it.sku || it.SKU || it.product?.sku || it.id,
    variant: String(it.variant || it.size || it.talla || '').trim(),
    qty: Number(it.qty || it.quantity || 1),
  }));
}

export async function createOrder({ cartItems, shipping, customer, paymentMethod }) {
  const items = mapCartItems(cartItems);
  if (!items.length) throw new Error('Carrito vacío');

  const body = { items, shipping, customer, paymentMethod };
  return api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
}

export async function markPaymentAwaiting(orderId, method, receiptUrl) {
  return api('/api/payments/manual/mark-awaiting', {
    method: 'POST',
    body: JSON.stringify({ orderId, method, receiptUrl }),
  });
}

export async function getOrderSummary(orderId) {
  return api(`/api/orders/${orderId}/summary`);
}
