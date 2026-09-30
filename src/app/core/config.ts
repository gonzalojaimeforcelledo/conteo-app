/**
 * URL del backend (proyecto separado).
 * Se lee en tiempo de ejecución desde public/config.js:
 *   window.__CONFIG__ = { apiUrl: 'https://api.conteo.tudominio.pe' }
 * Así el mismo build sirve para cualquier entorno sin recompilar.
 * Vacío = mismo origen (desarrollo con proxy.conf.json).
 */
declare global {
  interface Window { __CONFIG__?: { apiUrl?: string }; }
}

const configurada = typeof window !== 'undefined' ? window.__CONFIG__?.apiUrl?.trim() ?? '' : '';

export const API_BASE = configurada.replace(/\/$/, '');
export const API = `${API_BASE}/api`;

export function wsUrl(): string {
  const base = API_BASE || location.origin;
  return base.replace(/^http/, 'ws') + '/ws';
}
