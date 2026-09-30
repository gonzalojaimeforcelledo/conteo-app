import { Injectable, NgZone, WritableSignal, inject, signal } from '@angular/core';

/**
 * Persistencia local (localStorage) con reactividad entre pestañas.
 *
 * Cada colección vive en su propia clave y se expone como `signal`. Cuando
 * otra pestaña escribe (p. ej. el digitador guarda un acta), el evento nativo
 * `storage` + BroadcastChannel actualizan el signal y el tablero se redibuja
 * al instante sin recargar (RF-06 / RF-09 / RNF-02).
 *
 * Para migrar a Spring Boot basta con reemplazar este servicio (o DataService)
 * por uno que hable con la API REST + WebSocket manteniendo la misma interfaz.
 */
export const PREFIX = 'pn2026:';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private zone = inject(NgZone);
  private signals = new Map<string, WritableSignal<any>>();
  private channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pn2026') : null;

  constructor() {
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith(PREFIX)) return;
      this.zone.run(() => this.refresh(e.key!.slice(PREFIX.length)));
    });
    this.channel?.addEventListener('message', (e) => {
      this.zone.run(() => this.refresh(String(e.data)));
    });
  }

  collection<T>(key: string, inicial: T): WritableSignal<T> {
    let s = this.signals.get(key);
    if (!s) {
      s = signal<T>(this.read<T>(key) ?? inicial);
      this.signals.set(key, s);
    }
    return s as WritableSignal<T>;
  }

  save<T>(key: string, valor: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(valor));
    } catch (err) {
      console.error('No se pudo guardar en localStorage', err);
      throw new Error('El almacenamiento local está lleno o no disponible. Exporta un respaldo.');
    }
    this.collection<T>(key, valor).set(valor);
    this.channel?.postMessage(key);
  }

  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  exists(key: string): boolean {
    return localStorage.getItem(PREFIX + key) !== null;
  }

  /** Re-lee todas las colecciones (respaldo del evento storage, estilo polling). */
  sincronizar(): void {
    for (const key of this.signals.keys()) {
      const actual = JSON.stringify(this.signals.get(key)!());
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null && raw !== actual) this.refresh(key);
    }
  }

  private refresh(key: string): void {
    const s = this.signals.get(key);
    if (!s) return;
    const v = this.read(key);
    if (v !== null) s.set(v);
  }

  bytesUsados(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith(PREFIX)) total += (localStorage.getItem(k) ?? '').length * 2;
    }
    return total;
  }
}
