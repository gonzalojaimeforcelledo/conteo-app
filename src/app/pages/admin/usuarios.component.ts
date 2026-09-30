import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { UsuariosService } from '../../core/usuarios.service';
import { mensaje } from '../../core/errores';
import { Rol, Usuario } from '../../core/models';
import { fmtFecha } from '../../core/util';
import { ToastService } from '../../shared/toast.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-usuarios',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Usuarios</h1>
        <p>Personal autorizado. Digitador registra y corrige; supervisor además aprueba observadas; administrador gestiona todo.</p>
      </div>
      <div class="page-head__actions">
        <button type="button" class="btn btn--primary" (click)="nuevo()"><app-icon name="plus" /> Nuevo usuario</button>
      </div>
    </div>

    <div class="panel table-wrap">
      <table class="table">
        <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          @for (u of svc.usuarios(); track u.id) {
            <tr [class.off]="!u.activo">
              <td><strong>{{ u.usuario }}</strong></td>
              <td>{{ u.nombre }}</td>
              <td>{{ roles[u.rol] }}</td>
              <td>{{ u.activo ? 'Activo' : 'Desactivado' }}</td>
              <td class="muted">{{ fecha(u.creadoEn) }}</td>
              <td class="acc">
                <button type="button" class="btn btn--sm" (click)="clave(u)"><app-icon name="lock" /> Contraseña</button>
                <button type="button" class="btn btn--sm btn--ghost" (click)="alternar(u)">{{ u.activo ? 'Desactivar' : 'Activar' }}</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <dialog #dlg class="dlg">
      <form (submit)="guardar($event)">
        <div class="dlg__body">
          @if (modo() === 'nuevo') {
            <h2>Nuevo usuario</h2>
            <div class="field"><label for="un">Usuario</label>
              <input id="un" class="input" autocapitalize="none" autocomplete="off" [value]="f().usuario" (input)="set('usuario', $any($event.target).value)"></div>
            <div class="field"><label for="nn">Nombre</label>
              <input id="nn" class="input" [value]="f().nombre" (input)="set('nombre', $any($event.target).value)"></div>
            <div class="field"><label for="rr">Rol</label>
              <select id="rr" class="select" [value]="f().rol" (change)="set('rol', $any($event.target).value)">
                <option value="DIGITADOR">Digitador</option><option value="SUPERVISOR">Supervisor</option><option value="ADMIN">Administrador</option>
              </select></div>
          } @else {
            <h2>Cambiar contraseña de {{ objetivo()?.usuario }}</h2>
          }
          <div class="field"><label for="pp">Contraseña</label>
            <input id="pp" class="input" type="password" autocomplete="new-password" [value]="f().password" (input)="set('password', $any($event.target).value)">
            <span class="field__hint">Mínimo 8 caracteres.</span></div>
          @if (error()) { <p class="alert alert--error" role="alert">{{ error() }}</p> }
        </div>
        <div class="dlg__foot">
          <button type="button" class="btn" (click)="dlg.close()">Cancelar</button>
          <button type="submit" class="btn btn--primary" [disabled]="ocupado()">Guardar</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .acc { text-align: right; white-space: nowrap; } .acc .btn { margin-left: 4px; }
    .off td { color: var(--color-text-muted); }
  `,
})
export class UsuariosComponent implements OnInit {
  svc = inject(UsuariosService);
  private toast = inject(ToastService);
  dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  roles: Record<Rol, string> = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', DIGITADOR: 'Digitador' };
  modo = signal<'nuevo' | 'clave'>('nuevo');
  objetivo = signal<Usuario | null>(null);
  f = signal({ usuario: '', nombre: '', rol: 'DIGITADOR' as Rol, password: '' });
  error = signal('');
  ocupado = signal(false);
  fecha = fmtFecha;

  async ngOnInit() {
    try { await this.svc.cargar(); } catch (e) { this.toast.error(mensaje(e)); }
  }

  set(k: 'usuario' | 'nombre' | 'rol' | 'password', v: string) { this.f.update((x) => ({ ...x, [k]: v })); }

  nuevo() {
    this.modo.set('nuevo');
    this.f.set({ usuario: '', nombre: '', rol: 'DIGITADOR', password: '' });
    this.error.set('');
    this.dlg().nativeElement.showModal();
  }

  clave(u: Usuario) {
    this.modo.set('clave');
    this.objetivo.set(u);
    this.f.update((x) => ({ ...x, password: '' }));
    this.error.set('');
    this.dlg().nativeElement.showModal();
  }

  async guardar(ev: Event) {
    ev.preventDefault();
    this.ocupado.set(true);
    const err = this.modo() === 'nuevo'
      ? await this.svc.crear(this.f())
      : await this.svc.cambiarPassword(this.objetivo()!.id, this.f().password);
    this.ocupado.set(false);
    if (err) { this.error.set(err); return; }
    this.toast.ok(this.modo() === 'nuevo' ? 'Usuario creado.' : 'Contraseña actualizada.');
    this.dlg().nativeElement.close();
  }

  async alternar(u: Usuario) {
    const err = await this.svc.alternarActivo(u.id);
    err ? this.toast.error(err) : this.toast.ok(`Usuario ${u.usuario} ${u.activo ? 'desactivado' : 'activado'}.`);
  }
}
