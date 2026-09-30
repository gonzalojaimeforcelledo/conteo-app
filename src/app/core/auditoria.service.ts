import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from './config';
import { LogAuditoria, Pagina } from './models';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);

  buscar(q: string, tipo: string, pagina: number, tamano = 200): Promise<Pagina<LogAuditoria>> {
    let p = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (q.trim()) p = p.set('q', q.trim());
    if (tipo) p = p.set('tipo', tipo);
    return firstValueFrom(this.http.get<Pagina<LogAuditoria>>(`${API}/auditoria`, { params: p }));
  }
}
