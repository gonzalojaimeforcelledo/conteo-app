import { Routes } from '@angular/router';
import { authGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/public/dashboard.component').then((m) => m.DashboardComponent), title: 'Resultados — Pueblo Nuevo 2026' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent), title: 'Ingreso — Conteo de actas' },
  {
    path: 'admin',
    canActivate: [authGuard()],
    loadComponent: () => import('./pages/admin/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'actas' },
      { path: 'actas', loadComponent: () => import('./pages/admin/actas-list.component').then((m) => m.ActasListComponent), title: 'Actas' },
      { path: 'actas/nueva', loadComponent: () => import('./pages/admin/acta-form.component').then((m) => m.ActaFormComponent), title: 'Nueva acta' },
      { path: 'actas/:id', loadComponent: () => import('./pages/admin/acta-form.component').then((m) => m.ActaFormComponent), title: 'Editar acta' },
      { path: 'colegios', canActivate: [authGuard('ADMIN')], loadComponent: () => import('./pages/admin/colegios.component').then((m) => m.ColegiosComponent), title: 'Locales de votación' },
      { path: 'reportes', canActivate: [authGuard('ADMIN', 'SUPERVISOR')], loadComponent: () => import('./pages/admin/reportes.component').then((m) => m.ReportesComponent), title: 'Reportes y respaldo' },
      { path: 'auditoria', canActivate: [authGuard('ADMIN', 'SUPERVISOR')], loadComponent: () => import('./pages/admin/auditoria.component').then((m) => m.AuditoriaComponent), title: 'Auditoría' },
      { path: 'usuarios', canActivate: [authGuard('ADMIN')], loadComponent: () => import('./pages/admin/usuarios.component').then((m) => m.UsuariosComponent), title: 'Usuarios' },
    ],
  },
  { path: '**', redirectTo: '' },
];
