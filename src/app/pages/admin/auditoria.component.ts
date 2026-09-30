import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AuditoriaService } from '../../core/auditoria.service';
import { mensaje } from '../../core/errores';
import { LogAuditoria } from '../../core/models';
import { fmtFecha } from '../../core/util';

/** RF-12 — historial de acciones (solo lectura). */
@Component({
  selector: 'app-auditoria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Auditoría</h1>
        <p>Historial de todas las acciones: quién registró o corrigió cada acta y a qué hora exacta. No se puede editar.</p>
      </div>
    </div>

    <div class="filtros">
      <input class="input" type="search" placeholder="Buscar por usuario, N° de acta o texto" aria-label="Buscar en auditoría"
             [value]="q()" (input)="buscarTexto($any($event.target).value)">
      <select class="select" aria-label="Tipo de acción" [value]="tipo()" (change)="tipo.set($any($event.target).value); cargar()">
        <option value="">Todas las acciones</option>
        <option value="ACTA">Actas</option>
        <option value="SESION">Sesiones</option>
        <option value="OTRAS">Locales, usuarios y sistema</option>
      </select>
    </div>

    <div class="panel">
      <ol class="log">
        @for (l of lista(); track l.id) {
          <li class="log__item">
            <span class="log__dot" [attr.data-t]="grupo(l.accion)" aria-hidden="true"></span>
            <div class="log__main">
              <p class="log__head"><strong>{{ etiqueta[l.accion] ?? l.accion }}</strong> <span class="muted">por {{ l.usuario }}</span></p>
              <p class="log__det">{{ l.detalle }}</p>
            </div>
            <time class="log__time num" [attr.datetime]="l.fecha">{{ fecha(l.fecha) }}</time>
          </li>
        } @empty {
          <li class="empty">
            @if (error()) { <strong>No se pudo cargar</strong>{{ error() }} }
            @else if (cargando()) { <strong>Cargando…</strong> }
            @else { <strong>Sin registros</strong>No hay acciones que coincidan. }
          </li>
        }
      </ol>
      @if (lista().length < total()) {
        <div class="mas"><button type="button" class="btn" [disabled]="cargando()" (click)="mas()">Mostrar más ({{ total() - lista().length }} restantes)</button></div>
      }
    </div>
  `,
  styles: `
    .filtros { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 12px; margin-bottom: 16px; }
    .log { list-style: none; margin: 0; padding: 0; }
    .log__item { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 14px; padding: 14px 20px; align-items: start; }
    .log__item + .log__item { border-top: 1px solid var(--gray-100); }
    .log__dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; background: var(--gray-300); }
    .log__dot[data-t='acta'] { background: var(--red-600); }
    .log__dot[data-t='alerta'] { background: var(--color-warning); }
    .log__head { font-size: var(--text-sm); }
    .log__det { font-size: var(--text-sm); color: var(--gray-700); margin-top: 2px; word-break: break-word; }
    .log__time { font-size: var(--text-xs); color: var(--color-text-muted); white-space: nowrap; }
    .mas { padding: 16px; text-align: center; border-top: 1px solid var(--gray-100); }
    @media (max-width: 640px) {
      .filtros { grid-template-columns: 1fr; }
      .log__item { grid-template-columns: 12px minmax(0, 1fr); padding: 12px 14px; }
      .log__time { grid-column: 2; }
    }
  `,
})
export class AuditoriaComponent implements OnInit {
  private api = inject(AuditoriaService);
  q = signal('');
  tipo = signal('');
  lista = signal<LogAuditoria[]>([]);
  total = signal(0);
  cargando = signal(false);
  error = signal('');
  private pagina = 0;
  private espera?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.espera));
  }

  ngOnInit() {
    void this.cargar();
  }

  buscarTexto(v: string) {
    this.q.set(v);
    clearTimeout(this.espera);
    this.espera = setTimeout(() => this.cargar(), 350);
  }

  async cargar(mas = false) {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.pagina = mas ? this.pagina + 1 : 0;
      const p = await this.api.buscar(this.q(), this.tipo(), this.pagina);
      this.lista.set(mas ? [...this.lista(), ...p.contenido] : p.contenido);
      this.total.set(p.total);
    } catch (e) {
      this.error.set(mensaje(e));
    } finally {
      this.cargando.set(false);
    }
  }

  mas() {
    void this.cargar(true);
  }

  etiqueta: Partial<Record<string, string>> = {
    LOGIN: 'Inicio de sesión', LOGOUT: 'Cierre de sesión', LOGIN_FALLIDO: 'Intento de ingreso fallido',
    CREAR_ACTA: 'Acta registrada', EDITAR_ACTA: 'Acta corregida', ELIMINAR_ACTA: 'Acta eliminada',
    APROBAR_ACTA: 'Acta aprobada', OBSERVAR_ACTA: 'Acta observada',
    CREAR_COLEGIO: 'Local creado', EDITAR_COLEGIO: 'Local editado', ELIMINAR_COLEGIO: 'Local eliminado',
    CREAR_USUARIO: 'Usuario creado', EDITAR_USUARIO: 'Usuario modificado',
    SIMULACION: 'Ensayo simulado', EXPORTAR: 'Exportación',
  };

  grupo(a: string) {
    if (a === 'LOGIN_FALLIDO' || a === 'ELIMINAR_ACTA' || a === 'OBSERVAR_ACTA') return 'alerta';
    return a.endsWith('_ACTA') ? 'acta' : 'otro';
  }
  fecha = fmtFecha;
}
