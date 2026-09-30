import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, firstValueFrom } from 'rxjs';
import { API, wsUrl } from './config';
import { Consolidado } from './models';

export interface AvisoCambio { entidad: 'ACTA' | 'COLEGIO'; tipo: string; id?: number | null; }

/**
 * RF-09: tiempo real por WebSocket (STOMP) con respaldo por polling cada 4 s
 * mientras el socket no esté conectado.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private client?: Client;
  private polling?: ReturnType<typeof setInterval>;

  readonly consolidado = signal<Consolidado | null>(null);
  readonly conectado = signal(false);
  readonly error = signal(false);
  readonly cambios = new Subject<AvisoCambio>();

  iniciar(): void {
    if (this.client) return;
    void this.refrescar();
    this.activarPolling();

    this.client = new Client({
      brokerURL: wsUrl(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });
    this.client.onConnect = () => {
      this.zone.run(() => {
        this.conectado.set(true);
        this.detenerPolling();
      });
      this.client!.subscribe('/topic/consolidado', (m: IMessage) =>
        this.zone.run(() => this.consolidado.set(JSON.parse(m.body) as Consolidado)));
      this.client!.subscribe('/topic/actas', (m: IMessage) =>
        this.zone.run(() => this.cambios.next(JSON.parse(m.body) as AvisoCambio)));
      void this.refrescar(); // por si hubo cambios mientras estaba desconectado
    };
    const caido = () => this.zone.run(() => { this.conectado.set(false); this.activarPolling(); });
    this.client.onWebSocketClose = caido;
    this.client.onStompError = caido;
    this.client.activate();
  }

  async refrescar(): Promise<void> {
    try {
      const c = await firstValueFrom(this.http.get<Consolidado>(`${API}/public/consolidado`));
      this.consolidado.set(c);
      this.error.set(false);
    } catch {
      this.error.set(true);
    }
  }

  private activarPolling(): void {
    if (this.polling) return;
    this.polling = setInterval(() => {
      void this.refrescar();
      this.cambios.next({ entidad: 'ACTA', tipo: 'POLLING' });
    }, 4000);
  }

  private detenerPolling(): void {
    if (this.polling) clearInterval(this.polling);
    this.polling = undefined;
  }
}
