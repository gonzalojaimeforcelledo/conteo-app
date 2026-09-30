import { HttpErrorResponse } from '@angular/common/http';
import { ErrorApi } from './models';

/** Convierte cualquier error HTTP en mensajes legibles para el digitador. */
export function mensajes(err: unknown): string[] {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return ['Sin conexión con el servidor. Revisa tu internet e inténtalo otra vez.'];
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
