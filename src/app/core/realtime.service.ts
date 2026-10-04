import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, firstValueFrom } from 'rxjs';
import { API, wsUrl } from './config';
import { Consolidado, Eleccion, IDS_ELECCION } from './models';

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

  readonly consolidados: Record<Eleccion, ReturnType<typeof signal<Consolidado | null>>> = {
    DISTRITAL: signal<Consolidado | null>(null),
    PROVINCIAL: signal<Consolidado | null>(null),
    REGIONAL: signal<Consolidado | null>(null),
  };
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
      for (const e of IDS_ELECCION) {
        this.client!.subscribe(`/topic/consolidado/${e}`, (m: IMessage) =>
          this.zone.run(() => this.consolidados[e].set(JSON.parse(m.body) as Consolidado)));
      }
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
      const todos = await Promise.all(IDS_ELECCION.map((e) =>
        firstValueFrom(this.http.get<Consolidado>(`${API}/public/consolidado`, { params: { eleccion: e } }))));
      IDS_ELECCION.forEach((e, i) => this.consolidados[e].set(todos[i]));
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
