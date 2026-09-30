import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DataService } from '../../core/data.service';
import { ColegioLocal } from '../../core/models';
import { ToastService } from '../../shared/toast.service';
import { IconComponent } from '../../shared/icon.component';

type Borrador = { id?: number; nombre: string; codigo: string; distrito: string; totalMesas: number };

/** RF-10 — catálogo de locales; define el total de actas esperadas (RF-08). */
@Component({
  selector: 'app-colegios',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Locales de votación</h1>
        <p class="num">{{ data.colegios().length }} locales, {{ data.actasEsperadas() }} mesas en total. Este total es la base del porcentaje de actas contabilizadas.</p>
      </div>
      <div class="page-head__actions">
        <button type="button" class="btn btn--primary" (click)="editar()"><app-icon name="plus" /> Agregar local</button>
      </div>
    </div>

    @if (hayEjemplo()) {
      <p class="alert alert--info aviso">Hay locales de ejemplo cargados. Reemplázalos por los locales reales de Pueblo Nuevo antes de la jornada.</p>
    }

    <div class="panel table-wrap">
      <table class="table">
        <thead><tr><th>Código</th><th>Nombre del local</th><th>Distrito</th><th class="r">Mesas</th><th class="r">Actas registradas</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          @for (c of data.colegios(); track c.id) {
            <tr>
              <td><strong>{{ c.codigo }}</strong></td>
              <td>{{ c.nombre }}</td>
              <td>{{ c.distrito }}</td>
              <td class="r num">{{ c.totalMesas }}</td>
              <td class="r num">
                <span class="prog"><span [style.transform]="'scaleX(' + usadas(c.id) / c.totalMesas + ')'"></span></span>
                {{ usadas(c.id) }}
              </td>
              <td class="acc">
                <button type="button" class="btn btn--sm btn--ghost" (click)="editar(c)"><app-icon name="edit" /><span class="sr-only">Editar {{ c.nombre }}</span></button>
                <button type="button" class="btn btn--sm btn--ghost del" (click)="eliminar(c)" [disabled]="usadas(c.id) > 0"
                        [title]="usadas(c.id) > 0 ? 'Tiene actas registradas' : 'Eliminar'"><app-icon name="trash" /><span class="sr-only">Eliminar {{ c.nombre }}</span></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty"><strong>Sin locales</strong>Agrega los locales de votación del distrito.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <dialog #dlg class="dlg">
      <form (submit)="guardar($event)">
        <div class="dlg__body">
          <h2>{{ b().id ? 'Editar local' : 'Nuevo local' }}</h2>
          <div class="field">
            <label for="cn">Nombre</label>
            <input id="cn" class="input" [value]="b().nombre" (input)="set('nombre', $any($event.target).value)" placeholder="I.E. N° 22xxx">
          </div>
          <div class="dos">
            <div class="field">
              <label for="cc">Código</label>
              <input id="cc" class="input" [value]="b().codigo" (input)="set('codigo', $any($event.target).value)" autocapitalize="characters">
            </div>
            <div class="field">
              <label for="cm">Mesas</label>
              <input id="cm" class="input" inputmode="numeric" [value]="b().totalMesas || ''" (input)="setMesas($event)">
            </div>
          </div>
          <div class="field">
            <label for="cd">Distrito</label>
            <input id="cd" class="input" [value]="b().distrito" (input)="set('distrito', $any($event.target).value)">
          </div>
          @if (error()) { <p class="alert alert--error" role="alert">{{ error() }}</p> }
        </div>
        <div class="dlg__foot">
          <button type="button" class="btn" (click)="dlg.close()">Cancelar</button>
          <button type="submit" class="btn btn--primary">Guardar</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .aviso { margin-bottom: 16px; }
    .acc { text-align: right; white-space: nowrap; }
    .del { color: var(--color-danger); }
    .prog { display: inline-block; vertical-align: middle; width: 64px; height: 6px; border-radius: 3px; background: var(--gray-100); overflow: hidden; margin-right: 8px; }
    .prog span { display: block; height: 100%; background: var(--red-600); transform-origin: left; }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `,
})
export class ColegiosComponent {
  data = inject(DataService);
  private toast = inject(ToastService);
  dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  b = signal<Borrador>({ nombre: '', codigo: '', distrito: 'Pueblo Nuevo', totalMesas: 0 });
  error = signal('');
  hayEjemplo = computed(() => this.data.colegios().some((c) => c.nombre.includes('de ejemplo')));

  usadas(id: number) { return this.data.colegiosPorId().get(id)?.actasRegistradas ?? 0; }

  set<K extends keyof Borrador>(k: K, v: Borrador[K]) { this.b.update((x) => ({ ...x, [k]: v })); }

  setMesas(ev: Event) {
    const el = ev.target as HTMLInputElement;
    el.value = el.value.replace(/\D/g, '').slice(0, 4);
    this.set('totalMesas', Number(el.value) || 0);
  }

  editar(c?: ColegioLocal) {
    this.error.set('');
    this.b.set(c ? { id: c.id, nombre: c.nombre, codigo: c.codigo, distrito: c.distrito, totalMesas: c.totalMesas }
                 : { nombre: '', codigo: '', distrito: 'Pueblo Nuevo', totalMesas: 0 });
    this.dlg().nativeElement.showModal();
  }

  async guardar(ev: Event) {
    ev.preventDefault();
    const r = await this.data.guardarColegio(this.b());
    if (!r.ok) { this.error.set(r.errores.join(' ')); return; }
    this.toast.ok('Local guardado.');
    this.dlg().nativeElement.close();
  }

  async eliminar(c: ColegioLocal) {
    if (!confirm(`¿Eliminar el local ${c.nombre}?`)) return;
    const r = await this.data.eliminarColegio(c.id);
    if (!r.ok) this.toast.error(r.errores[0]);
    else this.toast.ok('Local eliminado.');
  }
}
