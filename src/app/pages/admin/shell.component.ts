import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { Rol } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

interface Item { ruta: string; texto: string; icono: string; roles?: Rol[]; }

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell" [class.shell--open]="menu()">
      <aside class="nav" aria-label="Menú del panel">
        <a routerLink="/" class="nav__brand">
          <span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span><strong>Conteo de actas</strong><small>Municipales y regionales 2026</small></span>
        </a>

        <a routerLink="/admin/actas/nueva" class="btn btn--primary btn--lg nav__cta">
          <app-icon name="plus" /> Registrar acta
        </a>

        <nav class="nav__list">
          @for (i of items(); track i.ruta) {
            <a [routerLink]="i.ruta" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: i.ruta === '/admin/actas' }" class="nav__item">
              <app-icon [name]="i.icono" /> {{ i.texto }}
              @if (i.ruta === '/admin/actas' && c().actasObservadas > 0) {
                <span class="nav__count num" [attr.aria-label]="c().actasObservadas + ' observadas'">{{ c().actasObservadas }}</span>
              }
            </a>
          }
          <a routerLink="/" target="_blank" rel="noopener" class="nav__item">
            <app-icon name="chart" /> Tablero público
          </a>
        </nav>

        <p class="estado-con" [class.estado-con--off]="!data.conectado()">
          <span aria-hidden="true"></span>{{ data.conectado() ? 'Conectado en tiempo real' : 'Reconectando con el servidor…' }}
        </p>
        <div class="nav__foot">
          <div class="me">
            <span class="me__av" aria-hidden="true">{{ inicial() }}</span>
            <span><strong>{{ auth.actual()?.nombre }}</strong><small>{{ rolTexto() }}</small></span>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" (click)="salir()">
            <app-icon name="logout" /> Salir
          </button>
        </div>
      </aside>

      <div class="scrim" (click)="menu.set(false)" aria-hidden="true"></div>

      <div class="body">
        <header class="mbar">
          <button type="button" class="btn btn--ghost mbar__menu" (click)="menu.set(true)" aria-label="Abrir menú">
            <app-icon name="menu" />
          </button>
          <strong>Conteo de actas</strong>
          <span class="mbar__dot" [class.mbar__dot--off]="!data.conectado()" [attr.title]="data.conectado() ? 'Conectado en tiempo real' : 'Reconectando'"></span>
          <span class="mbar__pct num">{{ c().actasContabilizadas }}/{{ c().actasEsperadas }}</span>
        </header>
        <main class="content"><router-outlet /></main>
        <a routerLink="/admin/actas/nueva" class="fab" aria-label="Registrar acta"><app-icon name="plus" /></a>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; background: var(--gray-50); min-height: 100vh; }
    .shell { display: grid; grid-template-columns: 264px minmax(0, 1fr); min-height: 100vh; }
    .nav { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 20px; padding: 20px 16px;
      background: var(--white); border-right: 1px solid var(--gray-200); overflow-y: auto; }
    .nav__brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--color-text); padding: 4px; }
    .nav__brand strong { display: block; font-family: var(--font-display); font-weight: 800; }
    .nav__brand small { display: block; color: var(--color-text-muted); font-size: var(--text-xs); }
    .mark { width: 34px; height: 34px; border-radius: 8px; background: var(--red-600); display: grid; align-content: center; gap: 3px; padding: 0 7px; flex: none; }
    .mark i { height: 4px; border-radius: 2px; background: var(--white); }
    .mark i:nth-child(2) { width: 72%; } .mark i:nth-child(3) { width: 42%; }
    .nav__cta { width: 100%; }
    .nav__list { display: grid; gap: 2px; }
    .nav__item { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; border-radius: var(--radius-md);
      color: var(--gray-700); text-decoration: none; font-weight: 600; font-size: var(--text-sm); transition: background var(--dur-fast); }
    .nav__item:hover { background: var(--gray-50); }
    .nav__item.is-active { background: var(--red-50); color: var(--red-700); }
    .nav__count { margin-left: auto; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; display: grid; place-items: center;
      background: var(--color-warning-soft); color: var(--color-warning); font-size: var(--text-xs); }
    .estado-con { margin-top: auto; display: flex; align-items: center; gap: 8px; font-size: var(--text-xs); color: var(--color-text-muted); padding: 0 4px; }
    .estado-con span { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); }
    .estado-con--off span { background: var(--color-warning); }
    .mbar__dot { width: 8px; height: 8px; border-radius: 50%; background: #8FE3B0; }
    .mbar__dot--off { background: #FFC862; }
    .nav__foot { display: grid; gap: 8px; padding-top: 16px; border-top: 1px solid var(--gray-200); }
    .me { display: flex; align-items: center; gap: 10px; }
    .me__av { width: 36px; height: 36px; border-radius: 50%; background: var(--gray-100); display: grid; place-items: center; font-weight: 700; }
    .me strong { display: block; font-size: var(--text-sm); }
    .me small { display: block; font-size: var(--text-xs); color: var(--color-text-muted); }
    .nav__foot .btn { justify-content: flex-start; }
    .content { padding: 32px clamp(16px, 4vw, 40px) 96px; max-width: 1180px; }
    .mbar, .fab, .scrim { display: none; }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .nav { position: fixed; inset: 0 auto 0 0; width: min(84vw, 300px); z-index: 40; transform: translateX(-105%);
        transition: transform 320ms var(--ease-spring); box-shadow: var(--shadow-lg);
        padding-top: calc(20px + env(safe-area-inset-top, 0px)); }
      .shell--open .nav { transform: none; }
      .scrim { display: block; position: fixed; inset: 0; z-index: 30; background: rgb(38 38 43 / .4); opacity: 0; pointer-events: none; transition: opacity var(--dur-med); }
      .shell--open .scrim { opacity: 1; pointer-events: auto; }
      .mbar { display: flex; align-items: center; gap: 8px; position: sticky; top: 0; z-index: 20; min-height: 56px; padding: 0 8px;
        padding-top: env(safe-area-inset-top, 0px); background: var(--red-600); color: var(--white); }
      .mbar strong { font-family: var(--font-display); font-weight: 800; flex: 1; }
      .mbar__menu { color: var(--white); width: 44px; padding: 0; }
      .mbar__menu:hover { background: rgb(255 255 255 / .12); }
      .mbar__pct { font-size: var(--text-sm); font-weight: 700; padding: 4px 10px; border-radius: 999px; background: rgb(255 255 255 / .16); margin-right: 8px; }
      .content { padding: 20px 16px 112px; }
      .fab { display: grid; place-items: center; position: fixed; right: 16px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 20;
        width: 60px; height: 60px; border-radius: 50%; background: var(--red-600); color: var(--white); box-shadow: var(--shadow-lg);
        transition: transform var(--dur-fast) var(--ease-out); }
      .fab:active { transform: scale(.94); }
      .fab app-icon { width: 26px; height: 26px; }
    }
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  data = inject(DataService);
  private router = inject(Router);
  c = this.data.consolidado;
  menu = signal(false);

  private todos: Item[] = [
    { ruta: '/admin/actas', texto: 'Actas', icono: 'list' },
    { ruta: '/admin/colegios', texto: 'Locales de votación', icono: 'school', roles: ['ADMIN'] },
    { ruta: '/admin/reportes', texto: 'Reportes y respaldo', icono: 'download', roles: ['ADMIN', 'SUPERVISOR'] },
    { ruta: '/admin/auditoria', texto: 'Auditoría', icono: 'history', roles: ['ADMIN', 'SUPERVISOR'] },
    { ruta: '/admin/usuarios', texto: 'Usuarios', icono: 'users', roles: ['ADMIN'] },
  ];

  items = computed(() => this.todos.filter((i) => !i.roles || i.roles.includes(this.auth.rol()!)));
  inicial = computed(() => (this.auth.actual()?.nombre ?? '?').charAt(0).toUpperCase());
  rolTexto = computed(() => ({ ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', DIGITADOR: 'Digitador' })[this.auth.rol() ?? 'DIGITADOR']);

  constructor() {
    void this.data.recargarPanel().catch(() => {});
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.menu.set(false));
  }

  async salir() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
