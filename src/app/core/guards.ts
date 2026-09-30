import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from './models';
import { AuthService } from './auth.service';

/** Protege las rutas de administración (equivalente local a JWT, RNF-03). */
export const authGuard = (...roles: Rol[]): CanActivateFn => (_r, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.tieneRol(...roles)) return true;
  if (!auth.autenticado()) return router.createUrlTree(['/login'], { queryParams: { volver: state.url } });
  return router.createUrlTree(['/admin']);
};
