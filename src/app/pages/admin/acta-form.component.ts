import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { Acta, ActaBorrador, ELECCIONES, Eleccion, EstadoActa, IDS_ELECCION } from '../../core/models';
import { fmtFecha, num, sumaCandidatos } from '../../core/util';
import { mensaje } from '../../core/errores';
import { ToastService } from '../../shared/toast.service';
import { IconComponent } from '../../shared/icon.component';

/** Datos comunes del acta física (una por mesa). */
interface Cabecera {
  numeroActa: string;
  colegioId: number | null;
  mesa: string;
  totalElectoresHabiles: number;
  totalVotantes: number;
  estado: EstadoActa;
  observacion: string;
}

/** Votos de una elección dentro del acta física. */
interface Seccion {
  votos: Record<number, number>;
  votosBlanco: number;
  votosNulosViciados: number;
  id?: number;
  version?: number;
  estadoOriginal?: EstadoActa;
}

type Cuadre = { tipo: 'ok' | 'warn' | 'error' | 'idle' | 'vacia'; texto: string };

const cabeceraVacia = (colegioId: number | null = null): Cabecera => ({
  numeroActa: '', colegioId, mesa: '', totalElectoresHabiles: 0, totalVotantes: 0, estado: 'CONTABILIZADA', observacion: '',
});
const seccionVacia = (): Seccion => ({ votos: {}, votosBlanco: 0, votosNulosViciados: 0 });
const seccionesVacias = (): Record<Eleccion, Seccion> => ({ DISTRITAL: seccionVacia(), PROVINCIAL: seccionVacia(), REGIONAL: seccionVacia() });

/**
 * RF-02 / RF-03 / RF-04 — digitación del acta física de una mesa.
 * Una misma acta trae las tres elecciones: distrital, provincial y regional.
 * Se envía todo junto (POST /api/actas/lote): se guarda completo o no se guarda nada.
 */
@Component({
  selector: 'app-acta-form',
  imports: [RouterLink, DecimalPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acta-form.component.html',
  styleUrl: './acta-form.component.scss',
})
export class ActaFormComponent implements OnInit {
  data = inject(DataService);
  auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private primerCampo = viewChild<ElementRef<HTMLInputElement>>('primero');

  id = input<string>();
  elecciones = ELECCIONES;

  f = signal<Cabecera>(cabeceraVacia());
  secs = signal<Record<Eleccion, Seccion>>(seccionesVacias());
  intentado = signal(false);
  guardando = signal(false);
  meta = signal<{ registrado: string; editado?: string } | null>(null);
  erroresServidor = signal<string[]>([]);

  idNum = computed(() => (this.id() ? Number(this.id()) : undefined));
  editando = computed(() => !!this.id());
  colegio = computed(() => {
    const id = this.f().colegioId;
    return id == null ? undefined : this.data.colegiosPorId().get(id);
  });
  /** Mesas del local que ya tienen acta (de cualquier elección). */
  mesasUsadas = computed(() => {
    const ids = new Set(IDS_ELECCION.map((e) => this.secs()[e].id).filter(Boolean));
    return new Set(this.data.actas()
      .filter((a) => a.colegioId === this.f().colegioId && !ids.has(a.id))
      .map((a) => a.mesa.trim())).size;
  });

  /** Una sección cuenta si tiene algún número digitado o ya existe en el servidor. */
  incluida(e: Eleccion): boolean {
    const s = this.secs()[e];
    return !!s.id || num(s.votosBlanco) > 0 || num(s.votosNulosViciados) > 0 || Object.values(s.votos).some((v) => num(v) > 0);
  }
  incluidas = computed(() => IDS_ELECCION.filter((e) => this.incluida(e)));

  borrador(e: Eleccion): ActaBorrador {
    const f = this.f();
    const s = this.secs()[e];
    return {
      eleccion: e, numeroActa: f.numeroActa, colegioId: f.colegioId, mesa: f.mesa,
      totalElectoresHabiles: f.totalElectoresHabiles, totalVotantes: f.totalVotantes,
      votos: s.votos, votosBlanco: s.votosBlanco, votosNulosViciados: s.votosNulosViciados,
      estado: f.estado, observacion: f.observacion, version: s.version,
    };
  }

  suma(e: Eleccion): number {
    const s = this.secs()[e];
    return sumaCandidatos(s.votos) + num(s.votosBlanco) + num(s.votosNulosViciados);
  }
  validos(e: Eleccion): number {
    return sumaCandidatos(this.secs()[e].votos);
  }

  cuadres = computed<Record<Eleccion, Cuadre>>(() => {
    const f = this.f();
    const hab = num(f.totalElectoresHabiles);
    const vot = num(f.totalVotantes);
    const r = {} as Record<Eleccion, Cuadre>;
    for (const e of IDS_ELECCION) {
      const s = this.suma(e);
      if (!this.incluida(e)) r[e] = { tipo: 'vacia', texto: 'Sin datos' };
      else if (hab && s > hab) r[e] = { tipo: 'error', texto: `Excede en ${s - hab} a los hábiles` };
      else if (!vot) r[e] = { tipo: 'idle', texto: 'Falta total de votantes' };
      else if (s !== vot) r[e] = { tipo: 'warn', texto: s < vot ? `Faltan ${vot - s}` : `Sobran ${s - vot}` };
      else r[e] = { tipo: 'ok', texto: 'Cuadra' };
    }
    return r;
  });

  /** Estado general para el color del panel lateral. */
  resumen = computed<Cuadre>(() => {
    const c = this.cuadres();
    const f = this.f();
    const tipos = this.incluidas().map((e) => c[e].tipo);
    if (num(f.totalElectoresHabiles) && num(f.totalVotantes) > num(f.totalElectoresHabiles))
      return { tipo: 'error', texto: 'Los votantes superan a los electores hábiles.' };
    if (!tipos.length) return { tipo: 'idle', texto: 'Digita los votos de cada elección para verificar el cuadre.' };
    if (tipos.includes('error')) return { tipo: 'error', texto: 'Alguna elección supera a los electores hábiles.' };
    if (tipos.includes('warn')) return { tipo: 'warn', texto: 'Alguna elección no cuadra con los votantes: quedará OBSERVADA.' };
    if (tipos.includes('idle')) return { tipo: 'idle', texto: 'Ingresa el total de votantes para verificar.' };
    return { tipo: 'ok', texto: tipos.length === 3 ? 'Las tres elecciones cuadran.' : 'Las elecciones digitadas cuadran.' };
  });

  /**
   * Valida cada elección con las reglas del servicio y une los mensajes:
   * los que se repiten en todas (datos comunes) salen una vez; los propios llevan el nombre de la elección.
   */
  v = computed(() => {
    const incl = this.incluidas();
    const errores: string[] = [];
    const advertencias: string[] = [];
    if (!incl.length) {
      errores.push('Digita los votos de al menos una elección.');
      for (const m of this.data.validar(this.borrador('DISTRITAL')).errores) if (!errores.includes(m)) errores.push(m);
      return { errores, advertencias };
    }
    const porE = incl.map((e) => ({ e, r: this.data.validar(this.borrador(e), this.secs()[e].id) }));
    const unir = (lista: string[], tomar: (x: { errores: string[]; advertencias: string[] }) => string[]) => {
      const cuenta = new Map<string, number>();
      porE.forEach(({ r }) => tomar(r).forEach((m) => cuenta.set(m, (cuenta.get(m) ?? 0) + 1)));
      porE.forEach(({ e, r }) => tomar(r).forEach((m) => {
        const txt = cuenta.get(m) === porE.length && porE.length > 1 ? m : `${ELECCIONES.find((x) => x.id === e)!.corto}: ${m}`;
        if (!lista.includes(txt)) lista.push(txt);
      }));
    };
    unir(errores, (x) => x.errores);
    unir(advertencias, (x) => x.advertencias);
    for (const e of IDS_ELECCION) {
      if (!incl.includes(e)) advertencias.push(`${ELECCIONES.find((x) => x.id === e)!.titulo}: sin votos, no se registrará.`);
    }
    return { errores, advertencias };
  });

  /** Un digitador no puede pasar a contabilizada un acta ya observada: eso lo aprueba el supervisor. */
  puedeContabilizar = computed(() =>
    this.auth.puedeAprobar() || !IDS_ELECCION.some((e) => this.secs()[e].estadoOriginal === 'OBSERVADA'));

  async ngOnInit() {
    const id = this.idNum();
    if (!id) {
      const unico = this.data.colegios().length === 1 ? this.data.colegios()[0].id : null;
      this.f.set(cabeceraVacia(unico));
      setTimeout(() => this.primerCampo()?.nativeElement.focus());
      return;
    }
    try {
      const base = await this.data.obtenerActa(id);
      if (!this.data.actas().length) await this.data.cargarActas();
      // Las otras elecciones de la misma mesa forman parte de la misma acta física.
      const hermanas = this.data.actas().filter((a) =>
        a.id !== base.id && a.colegioId === base.colegioId && a.mesa.trim() === base.mesa.trim());
      const actas: Acta[] = [base, ...(await Promise.all(hermanas.map((h) => this.data.obtenerActa(h.id))))];

      const secs = seccionesVacias();
      for (const a of actas) {
        const e = a.eleccion ?? 'DISTRITAL';
        if (secs[e].id) continue;
        secs[e] = { votos: { ...a.votos }, votosBlanco: a.votosBlanco, votosNulosViciados: a.votosNulosViciados,
                    id: a.id, version: a.version, estadoOriginal: a.estado };
      }
      this.secs.set(secs);
      this.f.set({
        numeroActa: base.numeroActa, colegioId: base.colegioId, mesa: base.mesa,
        totalElectoresHabiles: base.totalElectoresHabiles, totalVotantes: base.totalVotantes,
        estado: base.estado, observacion: actas.map((a) => a.observacion).find((o) => !!o) ?? '',
      });
      this.meta.set({
        registrado: `${base.registradoPor}, ${fmtFecha(base.fechaRegistro)}`,
        editado: base.actualizadoPor ? `${base.actualizadoPor}, ${fmtFecha(base.fechaActualizacion)}` : undefined,
      });
    } catch (e) {
      this.toast.error(mensaje(e));
      this.router.navigateByUrl('/admin/actas');
    }
  }

  estadoDe(e: Eleccion): EstadoActa | undefined {
    return this.secs()[e].estadoOriginal;
  }

  colegioElegido(valor: string) {
    this.campo('colegioId', valor ? Number(valor) : null);
  }

  campo<K extends keyof Cabecera>(k: K, valor: Cabecera[K]) {
    this.f.update((x) => ({ ...x, [k]: valor }));
  }

  numero(k: 'totalElectoresHabiles' | 'totalVotantes', ev: Event) {
    this.campo(k, this.limpiar(ev));
  }

  especial(e: Eleccion, k: 'votosBlanco' | 'votosNulosViciados', ev: Event) {
    const n = this.limpiar(ev);
    this.secs.update((s) => ({ ...s, [e]: { ...s[e], [k]: n } }));
  }

  voto(e: Eleccion, candidatoId: number, ev: Event) {
    const n = this.limpiar(ev);
    this.secs.update((s) => ({ ...s, [e]: { ...s[e], votos: { ...s[e].votos, [candidatoId]: n } } }));
  }

  mostrar(n: number | undefined): string {
    return n ? String(n) : '';
  }

  /** Enter avanza al siguiente campo (digitación rápida sin mouse); en el último, guarda. */
  siguiente(ev: Event) {
    const e = ev as KeyboardEvent;
    if (e.key !== 'Enter' || !(e.target as HTMLElement).hasAttribute?.('data-nav')) return;
    e.preventDefault();
    const campos = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-nav]'));
    const i = campos.indexOf(e.target as HTMLElement);
    const sig = campos[i + 1];
    if (sig) { sig.focus(); (sig as HTMLInputElement).select?.(); }
    else this.guardar(true);
  }

  async guardar(otra: boolean) {
    if (this.guardando()) return;
    this.intentado.set(true);
    this.erroresServidor.set([]);
    if (this.v().errores.length) {
      this.host.nativeElement.querySelector('.errores')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.guardando.set(true);
    try {
      const items = this.incluidas().map((e) => ({ id: this.secs()[e].id, datos: this.borrador(e) }));
      const r = await this.data.guardarLote(items);
      if (!r.ok) {
        this.erroresServidor.set(r.errores);
        this.toast.error(r.errores[0]);
        return;
      }
      const actas = r.valor ?? [];
      const obs = actas.filter((a) => a.estado !== 'CONTABILIZADA').length;
      this.toast.mostrar(
        `Acta ${this.f().numeroActa} ${this.editando() ? 'actualizada' : 'registrada'} (${actas.length} ${actas.length === 1 ? 'elección' : 'elecciones'})`
          + (obs ? `. ${obs} quedó como observada o por verificar.` : ' y contabilizada.'),
        obs ? 'info' : 'ok',
      );
      if (otra && !this.editando()) {
        this.f.set(cabeceraVacia(this.f().colegioId));
        this.secs.set(seccionesVacias());
        this.intentado.set(false);
        setTimeout(() => this.primerCampo()?.nativeElement.focus());
      } else {
        this.router.navigateByUrl('/admin/actas');
      }
    } finally {
      this.guardando.set(false);
    }
  }

  private limpiar(ev: Event): number {
    const el = ev.target as HTMLInputElement;
    const limpio = el.value.replace(/\D/g, '').slice(0, 5);
    if (el.value !== limpio) el.value = limpio;
    return num(limpio);
  }
}
