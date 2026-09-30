import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { Acta, EstadoActa } from '../../core/models';
import { fmtFecha, sumaVotos } from '../../core/util';
import { ToastService } from '../../shared/toast.service';
import { IconComponent } from '../../shared/icon.component';

type Filtro = EstadoActa | 'TODAS';

/** RF-05 — listado, filtros y flujo de aprobación de observadas. */
@Component({
  selector: 'app-actas-list',
  imports: [RouterLink, DecimalPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Actas</h1>
        <p class="num">{{ c().actasContabilizadas }} contabilizadas de {{ c().actasEsperadas }} esperadas ({{ c().porcentajeActas | number: '1.1-1' }}%).</p>
      </div>
      <div class="page-head__actions">
        <a routerLink="/admin/actas/nueva" class="btn btn--primary"><app-icon name="plus" /> Registrar acta</a>
      </div>
    </div>

    <div class="filtros">
      <div class="buscar">
        <app-icon name="search" />
        <input class="input" type="search" placeholder="Buscar por N° de acta o mesa" aria-label="Buscar por número de acta o mesa"
               [value]="q()" (input)="q.set($any($event.target).value)">
      </div>
      <select class="select" aria-label="Filtrar por local" [value]="colegio()" (change)="colegio.set($any($event.target).value)">
        <option value="">Todos los locales</option>
        @for (col of data.colegios(); track col.id) { <option [value]="col.id">{{ col.nombre }}</option> }
      </select>
      <div class="chips" role="group" aria-label="Filtrar por estado">
        @for (e of estados; track e.v) {
          <button type="button" class="chip" [attr.aria-pressed]="estado() === e.v" (click)="estado.set(e.v)">
            {{ e.t }} <span class="num">{{ conteo()[e.v] }}</span>
          </button>
        }
      </div>
    </div>

    @if (lista().length === 0) {
      <div class="panel empty">
        @if (data.actas().length === 0) {
          <strong>Aún no hay actas registradas</strong>
          <p>Registra la primera acta en cuanto llegue del local de votación.</p>
        } @else {
          <strong>Sin resultados</strong>
          <p>Ninguna acta coincide con los filtros elegidos.</p>
        }
      </div>
    } @else {
      <div class="panel table-wrap desk">
        <table class="table">
          <thead>
            <tr>
              <th>N° acta</th><th>Local</th><th>Mesa</th><th class="r">Suma / votantes</th><th>Estado</th><th>Registro</th><th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (a of lista(); track a.id) {
              <tr>
                <td><strong class="num">{{ a.numeroActa }}</strong></td>
                <td>{{ a.colegioNombre ?? data.nombreColegio(a.colegioId) }}</td>
                <td class="num">{{ a.mesa }}</td>
                <td class="r num" [class.descuadre]="suma(a) !== a.totalVotantes">{{ suma(a) | number }} / {{ a.totalVotantes | number }}</td>
                <td>
                  <span class="badge" [class]="'badge badge--' + a.estado">{{ texto[a.estado] }}</span>
                  @if (a.observacion) { <small class="obs" [title]="a.observacion">{{ a.observacion }}</small> }
                </td>
                <td class="reg"><span>{{ a.registradoPor }}</span><small>{{ fecha(a.fechaActualizacion ?? a.fechaRegistro) }}</small></td>
                <td class="acc">
                  @if (a.estado !== 'CONTABILIZADA' && auth.puedeAprobar()) {
                    <button type="button" class="btn btn--sm" (click)="aprobar(a)" title="Aprobar y contabilizar"><app-icon name="check" /> Aprobar</button>
                  }
                  @if (a.estado === 'CONTABILIZADA') {
                    <button type="button" class="btn btn--sm btn--ghost" (click)="abrir('observar', a)" title="Marcar como observada"><app-icon name="flag" /><span class="sr-only">Observar</span></button>
                  }
                  <a class="btn btn--sm btn--ghost" [routerLink]="['/admin/actas', a.id]" title="Corregir"><app-icon name="edit" /><span class="sr-only">Corregir</span></a>
                  @if (auth.esAdmin()) {
                    <button type="button" class="btn btn--sm btn--ghost del" (click)="abrir('eliminar', a)" title="Eliminar"><app-icon name="trash" /><span class="sr-only">Eliminar</span></button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <ul class="cards mob">
        @for (a of lista(); track a.id) {
          <li class="panel card">
            <div class="card__top">
              <strong class="num">Acta {{ a.numeroActa }}</strong>
              <span class="badge" [class]="'badge badge--' + a.estado">{{ texto[a.estado] }}</span>
            </div>
            <p class="muted">{{ a.colegioNombre }}, mesa {{ a.mesa }}</p>
            <p class="num" [class.descuadre]="suma(a) !== a.totalVotantes">Suma {{ suma(a) | number }} de {{ a.totalVotantes | number }} votantes</p>
            @if (a.observacion) { <p class="obs">{{ a.observacion }}</p> }
            <div class="card__acc">
              @if (a.estado !== 'CONTABILIZADA' && auth.puedeAprobar()) {
                <button type="button" class="btn btn--sm btn--primary" (click)="aprobar(a)"><app-icon name="check" /> Aprobar</button>
              }
              <a class="btn btn--sm" [routerLink]="['/admin/actas', a.id]"><app-icon name="edit" /> Corregir</a>
              @if (a.estado === 'CONTABILIZADA') {
                <button type="button" class="btn btn--sm" (click)="abrir('observar', a)"><app-icon name="flag" /> Observar</button>
              }
              @if (auth.esAdmin()) {
                <button type="button" class="btn btn--sm btn--danger" (click)="abrir('eliminar', a)" aria-label="Eliminar acta"><app-icon name="trash" /></button>
              }
            </div>
          </li>
        }
      </ul>
    }

    <dialog #dlg class="dlg" (close)="accion.set(null)">
      @if (accion(); as ac) {
        <form method="dialog" (submit)="confirmar($event)">
          <div class="dlg__body">
            <h2>{{ ac.tipo === 'eliminar' ? 'Eliminar acta ' : 'Observar acta ' }}{{ ac.acta.numeroActa }}</h2>
            <p class="muted">
              @if (ac.tipo === 'eliminar') { El acta dejará de sumar y se eliminará. La acción queda registrada en auditoría con sus datos. }
              @else { El acta dejará de sumar en el tablero hasta que un supervisor la apruebe. }
            </p>
            <div class="field">
              <label for="motivo">Motivo</label>
              <textarea id="motivo" class="textarea" required [value]="motivo()" (input)="motivo.set($any($event.target).value)"></textarea>
            </div>
          </div>
          <div class="dlg__foot">
            <button type="button" class="btn" (click)="dlg.close()">Cancelar</button>
            <button type="submit" class="btn btn--primary" [disabled]="!motivo().trim()">
              {{ ac.tipo === 'eliminar' ? 'Eliminar' : 'Marcar observada' }}
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
  styles: `
    .filtros { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 12px; margin-bottom: 16px; }
    .buscar { position: relative; }
    .buscar app-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); }
    .buscar .input { padding-left: 42px; }
    .chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--gray-300); background: var(--white);
      font: 600 var(--text-sm) var(--font-body); color: var(--gray-700); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
    .chip span { color: var(--color-text-muted); font-weight: 500; }
    .chip[aria-pressed='true'] { background: var(--gray-900); border-color: var(--gray-900); color: var(--white); }
    .chip[aria-pressed='true'] span { color: rgb(255 255 255 / .75); }
    .descuadre { color: var(--color-warning); font-weight: 700; }
    .obs { display: block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text-muted); font-size: var(--text-xs); margin-top: 4px; }
    .reg span, .reg small { display: block; } .reg small { color: var(--color-text-muted); font-size: var(--text-xs); }
    .acc { white-space: nowrap; text-align: right; }
    .acc .btn { margin-left: 4px; }
    .del { color: var(--color-danger); }
    .mob { display: none; }
    .cards { list-style: none; margin: 0; padding: 0; gap: 10px; }
    .card { padding: 14px 16px; display: grid; gap: 6px; }
    .card__top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .card .obs { max-width: none; white-space: normal; }
    .card__acc { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    @media (max-width: 760px) {
      .filtros { grid-template-columns: 1fr; }
      .desk { display: none; }
      .mob { display: grid; }
    }
  `,
})
export class ActasListComponent {
  data = inject(DataService);
  auth = inject(AuthService);
  private toast = inject(ToastService);
  dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  c = this.data.consolidado;
  q = signal('');
  colegio = signal('');
  private colegioNum = computed(() => (this.colegio() ? Number(this.colegio()) : null));
  estado = signal<Filtro>('TODAS');
  accion = signal<{ tipo: 'observar' | 'eliminar'; acta: Acta } | null>(null);
  motivo = signal('');

  texto: Record<EstadoActa, string> = { CONTABILIZADA: 'Contabilizada', OBSERVADA: 'Observada', PENDIENTE: 'Por verificar' };
  estados: { v: Filtro; t: string }[] = [
    { v: 'TODAS', t: 'Todas' },
    { v: 'OBSERVADA', t: 'Observadas' },
    { v: 'PENDIENTE', t: 'Por verificar' },
    { v: 'CONTABILIZADA', t: 'Contabilizadas' },
  ];

  private base = computed(() => {
    const q = this.q().trim().toLowerCase();
    const col = this.colegioNum();
    return this.data.actas().filter((a) =>
      (!col || a.colegioId === col) && (!q || a.numeroActa.toLowerCase().includes(q) || a.mesa.toLowerCase().includes(q)));
  });

  conteo = computed(() => {
    const r: Record<Filtro, number> = { TODAS: 0, OBSERVADA: 0, PENDIENTE: 0, CONTABILIZADA: 0 };
    for (const a of this.base()) { r.TODAS++; r[a.estado]++; }
    return r;
  });

  lista = computed(() => {
    const e = this.estado();
    return this.base()
      .filter((a) => e === 'TODAS' || a.estado === e)
      .sort((a, b) => (b.fechaActualizacion ?? b.fechaRegistro).localeCompare(a.fechaActualizacion ?? a.fechaRegistro));
  });

  suma = sumaVotos;
  fecha = fmtFecha;

  async aprobar(a: Acta) {
    const r = await this.data.cambiarEstado(a.id, 'CONTABILIZADA');
    if (!r.ok) this.toast.error(r.errores[0]);
    else this.toast.ok(`Acta ${a.numeroActa} aprobada y contabilizada.`);
  }

  abrir(tipo: 'observar' | 'eliminar', acta: Acta) {
    this.motivo.set('');
    this.accion.set({ tipo, acta });
    this.dlg().nativeElement.showModal();
  }

  async confirmar(ev: Event) {
    ev.preventDefault();
    const ac = this.accion();
    if (!ac || !this.motivo().trim()) return;
    const r = ac.tipo === 'eliminar'
      ? await this.data.eliminarActa(ac.acta.id, this.motivo().trim())
      : await this.data.cambiarEstado(ac.acta.id, 'OBSERVADA', this.motivo().trim());
    if (!r.ok) this.toast.error(r.errores[0]);
    else this.toast.ok(ac.tipo === 'eliminar' ? `Acta ${ac.acta.numeroActa} eliminada.` : `Acta ${ac.acta.numeroActa} marcada como observada.`);
    this.dlg().nativeElement.close();
  }
}
