import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from './config';
import { mensaje } from './errores';
import { Rol, Sesion } from './models';

const KEY = 'pn2026-sesion';

/**
 * RF-01 / RNF-03. El backend valida con BCrypt y devuelve un JWT.
 * El token vive en sessionStorage (se borra al cerrar la pestaña) y expira en 12 h.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private sesion = signal<Sesion | null>(this.leer());

  readonly actual = this.sesion.asReadonly();
  readonly autenticado = computed(() => !!this.sesion());
  readonly rol = computed(() => this.sesion()?.rol ?? null);
  readonly puedeAprobar = computed(() => this.rol() === 'ADMIN' || this.rol() === 'SUPERVISOR');
  readonly esAdmin = computed(() => this.rol() === 'ADMIN');

  token(): string | null {
    const s = this.leer();
    return s?.token ?? null;
  }

  async login(usuario: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const s = await firstValueFrom(this.http.post<Sesion>(`${API}/auth/login`, { usuario, password }));
      sessionStorage.setItem(KEY, JSON.stringify(s));
      this.sesion.set(s);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: mensaje(e) };
    }
  }

  async logout(): Promise<void> {
    if (this.token()) {
      try { await firstValueFrom(this.http.post(`${API}/auth/logout`, {})); } catch { /* sin importancia */ }
    }
    this.expirar();
  }

  /** Borra la sesión local (token vencido o 401). */
  expirar(): void {
    sessionStorage.removeItem(KEY);
    this.sesion.set(null);
  }

  usuarioActual(): string {
    return this.sesion()?.usuario ?? 'desconocido';
  }

  tieneRol(...roles: Rol[]): boolean {
    const s = this.leer();
    if (!s) {
      this.sesion.set(null);
      return false;
    }
    return roles.length === 0 || roles.includes(s.rol);
  }

  private leer(): Sesion | null {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Sesion | null;
      if (!s || s.expira < Date.now()) {
        sessionStorage.removeItem(KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
