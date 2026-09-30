import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast--' + t.tipo">
          <span>{{ t.texto }}</span>
          <button type="button" class="toast__x" (click)="svc.cerrar(t.id)" aria-label="Cerrar aviso">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts { position: fixed; z-index: 100; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%); display: grid; gap: 8px; width: min(92vw, 460px); }
    .toast { display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 16px; border-radius: var(--radius-md);
      background: var(--gray-900); color: #fff; box-shadow: var(--shadow-lg); font-size: var(--text-sm);
      animation: entra 320ms var(--ease-spring); }
    .toast span { flex: 1; }
    .toast--error { background: var(--red-800); }
    .toast--ok { border-left: 4px solid var(--green-500); }
    .toast__x { background: none; border: 0; color: inherit; font-size: 20px; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; }
    .toast__x:hover { background: rgb(255 255 255 / .12); }
    @keyframes entra { from { opacity: 0; transform: translateY(12px) scale(.98); } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `,
})
export class ToastsComponent {
  svc = inject(ToastService);
}
