import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; tipo: 'ok' | 'error' | 'info'; texto: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private n = 0;

  mostrar(texto: string, tipo: Toast['tipo'] = 'ok', ms = 3800): void {
    const t = { id: ++this.n, tipo, texto };
    this.toasts.update((l) => [...l, t].slice(-4));
    setTimeout(() => this.cerrar(t.id), ms);
  }
  ok(t: string) { this.mostrar(t, 'ok'); }
  error(t: string) { this.mostrar(t, 'error', 6000); }
  info(t: string) { this.mostrar(t, 'info'); }
  cerrar(id: number) { this.toasts.update((l) => l.filter((x) => x.id !== id)); }
}
