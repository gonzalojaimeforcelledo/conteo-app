import { HttpErrorResponse } from '@angular/common/http';
import { ErrorApi } from './models';
import { API_BASE } from './config';

/** Convierte cualquier error HTTP en mensajes legibles para el digitador. */
export function mensajes(err: unknown): string[] {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return ['Sin conexión con el servidor. Revisa tu internet e inténtalo otra vez.'];
    // 404/405 con HTML (o sin JSON): la petición llegó al hosting del frontend, no a la API.
    if ((err.status === 404 || err.status === 405) && !(err.error && typeof err.error === 'object' && 'mensaje' in err.error)) {
      return [API_BASE
        ? `El servidor ${API_BASE} no respondió como la API (${err.status}). Revisa la URL en config.js.`
        : `No hay URL del backend configurada (config.js) y la petición llegó al hosting del frontend (${err.status}).`];
    }
    const e = err.error as Partial<ErrorApi> | null;
    if (e?.errores?.length) return e.errores;
    if (e?.mensaje) return [e.mensaje];
    if (err.status === 403) return ['No tienes permiso para esta acción.'];
    if (err.status === 401) return ['Tu sesión expiró. Vuelve a ingresar.'];
    return [`Error del servidor (${err.status}).`];
  }
  return [(err as Error)?.message ?? 'Ocurrió un error inesperado.'];
}

export const mensaje = (err: unknown): string => mensajes(err)[0];
