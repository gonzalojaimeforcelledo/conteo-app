import { Injectable, inject } from '@angular/core';
import { AccionAuditoria, LogAuditoria } from './models';
import { StorageService } from './storage.service';
import { ahora, uid } from './util';

/** RF-12: registro de auditoría append-only. */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private store = inject(StorageService);
  readonly logs = this.store.collection<LogAuditoria[]>('auditoria', []);

  registrar(
    usuario: string,
    accion: AccionAuditoria,
    entidad: LogAuditoria['entidad'],
    detalle: string,
    entidadId?: string,
  ): void {
    const log: LogAuditoria = { id: uid(), usuario, accion, entidad, entidadId, detalle, fecha: ahora() };
    // Se relee del disco antes de escribir para no pisar logs de otra pestaña.
    const actuales = this.store.read<LogAuditoria[]>('auditoria') ?? [];
    this.store.save('auditoria', [log, ...actuales]);
  }
}
