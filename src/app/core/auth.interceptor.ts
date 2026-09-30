import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API } from './config';

/** Adjunta el JWT y, si el servidor responde 401, cierra la sesión y lleva al login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const esApi = req.url.startsWith(API);
  const r = token && esApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(r).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && esApi && !req.url.endsWith('/auth/login')) {
        auth.expirar();
        router.navigate(['/login'], { queryParams: { volver: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
