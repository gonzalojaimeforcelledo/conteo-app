import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { DataService } from './core/data.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Hash routing: funciona en cualquier hosting estático sin reglas de reescritura.
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
    // No bloquea el arranque: el tablero se pinta y los datos llegan al instante siguiente.
    provideAppInitializer(() => { void inject(DataService).inicializar(); }),
  ],
};
