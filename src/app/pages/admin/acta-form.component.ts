import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { ActaBorrador, EstadoActa } from '../../core/models';
import { fmtFecha, num, sumaCandidatos, sumaVotos } from '../../core/util';
import { mensaje } from '../../core/errores';
import { ToastService } from '../../shared/toast.service';
import { IconComponent } from '../../shared/icon.component';

const vacio = (colegioId: number | null = null): ActaBorrador => ({
  numeroActa: '', colegioId, mesa: '', totalElectoresHabiles: 0, totalVotantes: 0,
  votos: {}, votosBlanco: 0, votosNulosViciados: 0, estado: 'CONTABILIZADA', observacion: '',
});

/** RF-02 / RF-03 / RF-04 — formulario rápido de digitación. */
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
  f = signal<ActaBorrador>(vacio());
  intentado = signal(false);
  guardando = signal(false);
  estadoOriginal = signal<EstadoActa | null>(null);
  meta = signal<{ registrado: string; editado?: string } | null>(null);
  erroresServidor = signal<string[]>([]);
  idNum = computed(() => (this.id() ? Number(this.id()) : undefined));

  editando = computed(() => !!this.id());
  colegio = computed(() => {
    const id = this.f().colegioId;
    return id == null ? undefined : this.data.colegiosPorId().get(id);
  });
  mesasUsadas = computed(() => this.data.actas().filter((a) => a.colegioId === this.f().colegioId && a.id !== this.idNum()).length);
  suma = computed(() => sumaVotos(this.f()));
  validos = computed(() => sumaCandidatos(this.f().votos));
  v = computed(() => this.data.validar(this.f(), this.idNum()));

  cuadre = computed<{ tipo: 'ok' | 'warn' | 'error' | 'idle'; texto: string }>(() => {
    const f = this.f();
    const hab = num(f.totalElectoresHabiles);
    const vot = num(f.totalVotantes);
    const s = this.suma();
    if (!hab && !vot && !s) return { tipo: 'idle', texto: 'Digita los votos para verificar el cuadre del acta.' };
    if (hab && s > hab) return { tipo: 'error', texto: `Excede en ${s - hab} a los electores hábiles.` };
    if (hab && vot > hab) return { tipo: 'error', texto: 'Los votantes superan a los electores hábiles.' };
    if (vot && s !== vot) return { tipo: 'warn', texto: s < vot ? `Faltan ${vot - s} votos para cuadrar.` : `Sobran ${s - vot} votos respecto a los votantes.` };
    if (vot && s === vot) return { tipo: 'ok', texto: 'El acta cuadra.' };
    return { tipo: 'idle', texto: 'Ingresa el total de votantes para verificar.' };
  });

  /** Un digitador no puede pasar a contabilizada un acta ya observada: eso lo aprueba el supervisor. */
  puedeContabilizar = computed(() => this.auth.puedeAprobar() || this.estadoOriginal() !== 'OBSERVADA');

  async ngOnInit() {
    const id = this.idNum();
    if (id) {
      try {
        const a = await this.data.obtenerActa(id);
        this.f.set({
          numeroActa: a.numeroActa, colegioId: a.colegioId, mesa: a.mesa,
          totalElectoresHabiles: a.totalElectoresHabiles, totalVotantes: a.totalVotantes,
          votos: { ...a.votos }, votosBlanco: a.votosBlanco, votosNulosViciados: a.votosNulosViciados,
          estado: a.estado, observacion: a.observacion ?? '', version: a.version,
        });
        this.estadoOriginal.set(a.estado);
        this.meta.set({
          registrado: `${a.registradoPor}, ${fmtFecha(a.fechaRegistro)}`,
          editado: a.actualizadoPor ? `${a.actualizadoPor}, ${fmtFecha(a.fechaActualizacion)}` : undefined,
        });
      } catch (e) {
        this.toast.error(mensaje(e));
        this.router.navigateByUrl('/admin/actas');
      }
    } else {
      const unico = this.data.colegios().length === 1 ? this.data.colegios()[0].id : null;
      this.f.set(vacio(unico));
      setTimeout(() => this.primerCampo()?.nativeElement.focus());
    }
  }

  colegioElegido(valor: string) {
    this.campo('colegioId', valor ? Number(valor) : null);
  }

  campo<K extends keyof ActaBorrador>(k: K, valor: ActaBorrador[K]) {
    this.f.update((x) => ({ ...x, [k]: valor }));
  }

  numero(k: 'totalElectoresHabiles' | 'totalVotantes' | 'votosBlanco' | 'votosNulosViciados', ev: Event) {
    this.campo(k, this.limpiar(ev));
  }

  voto(candidatoId: number, ev: Event) {
    const n = this.limpiar(ev);
    this.f.update((x) => ({ ...x, votos: { ...x.votos, [candidatoId]: n } }));
  }

  mostrar(n: number | undefined): string {
    return n ? String(n) : '';
  }

  /** Solo dígitos; Enter avanza al siguiente campo (digitación rápida sin mouse). */
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
      const id = this.idNum();
      const r = id ? await this.data.editarActa(id, this.f()) : await this.data.crearActa(this.f());
      if (!r.ok) {
        this.erroresServidor.set(r.errores);
        this.toast.error(r.errores[0]);
        return;
      }
      const acta = r.valor;
      this.toast.mostrar(
        `Acta ${acta.numeroActa} ${id ? 'actualizada' : 'registrada'}${acta.estado === 'CONTABILIZADA' ? ' y contabilizada' : ` como ${acta.estado.toLowerCase()}`}.`,
        acta.estado === 'CONTABILIZADA' ? 'ok' : 'info',
      );
      if (otra && !id) {
        this.f.set(vacio(this.f().colegioId));
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
