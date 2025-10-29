// src/services/auth.js

// URL del backend
const API = (
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/+$/, '');

// Borra token y cache local
export function clearSession() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('me');
  } catch {
    /* ignorar errores de localStorage (modo incógnito, cuota, etc.) */
  }
}

// Guarda token cuando inicias sesión
export function saveToken(token) {
  if (token) localStorage.setItem('token', token);
}

// Obtiene el usuario actual (intenta cache y luego backend)
export async function getMe() {
  const token = localStorage.getItem('token') || '';
  if (!token) return null;

  // 1) cache local
  const cached = localStorage.getItem('me');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // cache corrupto → lo borramos
      localStorage.removeItem('me');
    }
  }

  // 2) pedir al backend
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('auth');

    const data = await res.json();
    localStorage.setItem('me', JSON.stringify(data));
    return data;
  } catch {
    // token inválido/expirado
    clearSession();
    return null;
  }
}

// Cierra sesión
export function logout() {
  clearSession();
  // limpia caches si existen (opcional)
  try {
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
  } catch {
    /* ignorar errores al limpiar Cache Storage */
  }
  location.reload();
}
