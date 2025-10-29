// src/services/api.js
const BASE =
  (import.meta?.env?.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

export const API_BASE = BASE;

export async function api(path, opts = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });

  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw }; }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
