import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { debounceTime, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { API } from './config';
import { mensajes } from './errores';
import { Acta, ActaBorrador, Candidato, ColegioLocal, Consolidado, EstadoActa } from './models';
import { RealtimeService } from './realtime.service';
import { num, sumaVotos } from './util';

export type { ActaBorrador } from './models';

export interface Validacion { errores: string[]; advertencias: string[]; }
export type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: string[] };

const CONSOLIDADO_VACIO: Consolidado = {
  resultados: [], votosValidos: 0, votosBlanco: 0, votosNulos: 0, votosEmitidos: 0, electoresHabiles: 0,
  actasContabilizadas: 0, actasObservadas: 0, actasPendientes: 0, actasEsperadas: 0,
  porcentajeActas: 0, participacion: 0, ultimaActualizacion: null,
};

/**
 * Acceso a la API REST. Mantiene en signals los datos que usan las pantallas
 * y los recarga cuando el servidor avisa de un cambio por WebSocket.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private rt = inject(RealtimeService);

  readonly candidatos = signal<Candidato[]>([]);
  readonly colegios = signal<ColegioLocal[]>([]);
  readonly actas = signal<Acta[]>([]);
  readonly cargando = signal(false);

  readonly consolidado = computed<Consolidado>(() => this.rt.consolidado() ?? CONSOLIDADO_VACIO);
  readonly conectado = this.rt.conectado;
  readonly sinServidor = this.rt.error;
  readonly colegiosPorId = computed(() => new Map(this.colegios().map((c) => [c.id, c])));
  readonly actasEsperadas = computed(() => this.colegios().reduce((s, c) => s + c.totalMesas, 0));

  constructor() {
    // Otro digitador guardó algo: refresca el panel (agrupando ráfagas).
    this.rt.cambios.pipe(debounceTime(400)).subscribe(() => {
      if (this.auth.autenticado()) void this.recargarPanel();
    });
  }

  async inicializar(): Promise<void> {
    this.rt.iniciar();
    try {
      this.candidatos.set(await firstValueFrom(this.http.get<Candidato[]>(`${API}/public/candidatos`)));
    } catch { /* el tablero lo reintentará con el consolidado */ }
  }

  async recargarPanel(): Promise<void> {
    await Promise.all([this.cargarActas(), this.cargarColegios()]);
  }

  // ------------------------------------------------------------------ ACTAS

  async cargarActas(): Promise<void> {
    this.cargando.set(true);
    try {
      this.actas.set(await firstValueFrom(this.http.get<Acta[]>(`${API}/actas`)));
    } finally {
      this.cargando.set(false);
    }
  }

  obtenerActa(id: number): Promise<Acta> {
    return firstValueFrom(this.http.get<Acta>(`${API}/actas/${id}`));
  }

  acta(id: number): Acta | undefined {
    return this.actas().find((a) => a.id === id);
  }

  /** Validación previa en el navegador (respuesta inmediata). El servidor vuelve a validar todo. */
  validar(b: ActaBorrador, idExcluir?: number): Validacion {
    const errores: string[] = [];
    const advertencias: string[] = [];
    const otras = this.actas().filter((a) => a.id !== idExcluir);
    const numero = b.numeroActa.trim();
    const mesa = b.mesa.trim();
    const colegio = b.colegioId != null ? this.colegiosPorId().get(b.colegioId) : undefined;

    if (!numero) errores.push('Ingresa el número de acta.');
    else if (otras.some((a) => a.numeroActa.trim().toLowerCase() === numero.toLowerCase()))
      errores.push(`El acta N° ${numero} ya fue registrada.`);
    if (!colegio) errores.push('Selecciona el colegio o local de votación.');
    if (!mesa) errores.push('Ingresa el número de mesa.');
    else if (colegio && otras.some((a) => a.colegioId === colegio.id && a.mesa.trim() === mesa))
      errores.push(`La mesa ${mesa} de ${colegio.nombre} ya tiene un acta registrada.`);
    if (colegio && idExcluir == null && otras.filter((a) => a.colegioId === colegio.id).length >= colegio.totalMesas)
      errores.push(`${colegio.nombre} ya tiene sus ${colegio.totalMesas} mesas registradas. Revisa el catálogo de locales.`);

    const habiles = num(b.totalElectoresHabiles);
    const votantes = num(b.totalVotantes);
    const suma = sumaVotos(b);
    if (habiles <= 0) errores.push('Ingresa el total de electores hábiles de la mesa.');
    if (habiles > 0 && votantes > habiles) errores.push(`Votaron ${votantes} pero la mesa solo tiene ${habiles} electores hábiles.`);
    if (habiles > 0 && suma > habiles) errores.push(`La suma de votos (${suma}) supera a los electores hábiles (${habiles}).`);
    if (votantes > 0 && suma !== votantes && suma <= habiles)
      advertencias.push(`La suma de votos (${suma}) no coincide con el total de votantes (${votantes}). El acta quedará como OBSERVADA.`);
    if (suma === 0) advertencias.push('El acta no tiene votos. Verifica que esté bien digitada.');
    return { errores, advertencias };
  }

  crearActa(b: ActaBorrador): Promise<Resultado<Acta>> {
    return this.ejecutar(this.http.post<Acta>(`${API}/actas`, this.limpiar(b)), () => this.cargarActas());
  }

  editarActa(id: number, b: ActaBorrador): Promise<Resultado<Acta>> {
    return this.ejecutar(this.http.put<Acta>(`${API}/actas/${id}`, this.limpiar(b)), () => this.cargarActas());
  }

  cambiarEstado(id: number, estado: EstadoActa, motivo = ''): Promise<Resultado<Acta>> {
    return this.ejecutar(this.http.patch<Acta>(`${API}/actas/${id}/estado`, { estado, motivo }), () => this.cargarActas());
  }

  eliminarActa(id: number, motivo: string): Promise<Resultado<null>> {
    const params = new HttpParams().set('motivo', motivo);
    return this.ejecutar(this.http.delete<null>(`${API}/actas/${id}`, { params }), () => this.recargarPanel());
  }

  // --------------------------------------------------------------- COLEGIOS

  async cargarColegios(): Promise<void> {
    this.colegios.set(await firstValueFrom(this.http.get<ColegioLocal[]>(`${API}/colegios`)));
  }

  guardarColegio(c: { id?: number; nombre: string; codigo: string; distrito: string; totalMesas: number }): Promise<Resultado<ColegioLocal>> {
    const body = { nombre: c.nombre, codigo: c.codigo, distrito: c.distrito, totalMesas: num(c.totalMesas) };
    const req = c.id ? this.http.put<ColegioLocal>(`${API}/colegios/${c.id}`, body) : this.http.post<ColegioLocal>(`${API}/colegios`, body);
    return this.ejecutar(req, () => this.cargarColegios());
  }

  eliminarColegio(id: number): Promise<Resultado<null>> {
    return this.ejecutar(this.http.delete<null>(`${API}/colegios/${id}`), () => this.cargarColegios());
  }

  nombreColegio(id: number): string {
    return this.colegiosPorId().get(id)?.nombre ?? '(local eliminado)';
  }

  // ----------------------------------------------------- ENSAYO Y RESPALDO

  generarSimulacion(cantidad: number): Promise<Resultado<{ cantidad: number }>> {
    const params = new HttpParams().set('cantidad', cantidad);
    return this.ejecutar(this.http.post<{ cantidad: number }>(`${API}/simulacion`, null, { params }), () => this.recargarPanel());
  }

  borrarActasSimuladas(): Promise<Resultado<{ cantidad: number }>> {
    return this.ejecutar(this.http.delete<{ cantidad: number }>(`${API}/simulacion`), () => this.recargarPanel());
  }

  respaldo(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${API}/respaldo`));
  }

  registrarExportacion(formato: string): void {
    const params = new HttpParams().set('formato', formato);
    this.http.post(`${API}/respaldo/exportacion`, null, { params }).subscribe({ error: () => {} });
  }

  // -------------------------------------------------------------- internos

  private limpiar(b: ActaBorrador): ActaBorrador {
    const votos: Record<number, number> = {};
    for (const c of this.candidatos()) votos[c.id] = num(b.votos[c.id]);
    return {
      ...b,
      numeroActa: b.numeroActa.trim(),
      mesa: b.mesa.trim(),
      votos,
      votosBlanco: num(b.votosBlanco),
      votosNulosViciados: num(b.votosNulosViciados),
      totalElectoresHabiles: num(b.totalElectoresHabiles),
      totalVotantes: num(b.totalVotantes),
      observacion: b.observacion?.trim() || undefined,
    };
  }

  private async ejecutar<T>(obs: import('rxjs').Observable<T>, despues: () => Promise<void>): Promise<Resultado<T>> {
    try {
      const valor = await firstValueFrom(obs, { defaultValue: null as T });
      await despues().catch(() => {});
      return { ok: true, valor };
    } catch (e) {
      return { ok: false, errores: mensajes(e) };
    }
  }
}
