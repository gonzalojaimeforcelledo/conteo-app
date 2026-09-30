import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      <section class="side" aria-hidden="true">
        <span class="mark"><i></i><i></i><i></i></span>
        <p class="side__title">Conteo de actas</p>
        <p class="side__sub">Pueblo Nuevo, elección de Alcalde. Domingo 4 de octubre de 2026.</p>
      </section>

      <section class="card">
        <a routerLink="/" class="back">Ver resultados públicos</a>
        <h1>Ingreso del personal</h1>
        <p class="muted">Solo para digitadores, supervisores y administradores autorizados.</p>

        <form (ngSubmit)="entrar()" class="form" novalidate>
          <div class="field">
            <label for="u">Usuario</label>
            <input id="u" name="u" class="input" autocomplete="username" autocapitalize="none" spellcheck="false"
                   [(ngModel)]="usuario" required autofocus>
          </div>
          <div class="field">
            <label for="p">Contraseña</label>
            <div class="pass">
              <input id="p" name="p" class="input" [type]="ver() ? 'text' : 'password'" autocomplete="current-password"
                     [(ngModel)]="password" required>
              <button type="button" class="pass__btn" (click)="ver.set(!ver())" [attr.aria-pressed]="ver()">
                {{ ver() ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>
          @if (error()) { <p class="alert alert--error" role="alert">{{ error() }}</p> }
          <button class="btn btn--primary btn--lg" type="submit" [disabled]="cargando() || !usuario || !password">
            {{ cargando() ? 'Verificando…' : 'Ingresar' }}
          </button>
        </form>

        <details class="demo">
          <summary>Usuarios iniciales de este equipo</summary>
          <p>admin / admin2026, supervisor / super2026, digitador / digita2026. Cámbialas en Usuarios antes de la jornada.</p>
        </details>
      </section>
    </main>
  `,
  styles: `
    .login { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); }
    .side { background: var(--red-600); color: var(--white); padding: 48px; display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; }
    .mark { width: 56px; height: 56px; border-radius: 14px; background: var(--white); display: grid; align-content: center; gap: 5px; padding: 0 12px; margin-bottom: auto; }
    .mark i { height: 6px; border-radius: 3px; background: var(--red-600); }
    .mark i:nth-child(2) { width: 72%; } .mark i:nth-child(3) { width: 42%; }
    .side__title { font-family: var(--font-display); font-weight: 900; font-stretch: 80%; font-size: clamp(3rem, 7vw, 5rem); line-height: .9; letter-spacing: -.03em; }
    .side__sub { font-size: var(--text-lg); max-width: 28ch; opacity: .92; }
    .card { align-self: center; justify-self: center; width: min(100% - 32px, 400px); padding: 40px 0; display: grid; gap: 8px; }
    .back { font-size: var(--text-sm); font-weight: 600; text-decoration: none; margin-bottom: 24px; }
    .back:hover { text-decoration: underline; }
    .form { display: grid; gap: 16px; margin-top: 24px; }
    .pass { position: relative; }
    .pass .input { padding-right: 88px; }
    .pass__btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); min-height: 36px; padding: 0 10px; border: 0; border-radius: 8px;
      background: transparent; color: var(--gray-700); font: 600 var(--text-sm) var(--font-body); cursor: pointer; }
    .pass__btn:hover { background: var(--gray-100); }
    .demo { margin-top: 28px; font-size: var(--text-sm); color: var(--color-text-muted); }
    .demo summary { cursor: pointer; font-weight: 600; min-height: 32px; }
    @media (max-width: 760px) {
      .login { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .side { padding: 24px 20px; flex-direction: row; align-items: center; }
      .mark { width: 40px; height: 40px; margin: 0; padding: 0 8px; gap: 3px; border-radius: 10px; }
      .mark i { height: 4px; }
      .side__title { font-size: 1.6rem; }
      .side__sub { display: none; }
      .card { align-self: start; padding-top: 24px; }
    }
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  volver = input<string>();

  usuario = '';
  password = '';
  ver = signal(false);
  cargando = signal(false);
  error = signal('');

  async entrar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      const r = await this.auth.login(this.usuario, this.password);
      if (r.ok) this.router.navigateByUrl(this.volver() || '/admin');
      else this.error.set(r.error);
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudo iniciar sesión.');
    } finally {
      this.cargando.set(false);
    }
  }
}
