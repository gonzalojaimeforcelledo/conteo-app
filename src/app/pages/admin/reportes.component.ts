import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DataService } from '../../core/data.service';
import { ExportService } from '../../core/export.service';
import { AuthService } from '../../core/auth.service';
import { mensaje } from '../../core/errores';
import { ToastService } from '../../shared/toast.service';
import { IconComponent } from '../../shared/icon.component';

/** RF-11 (reportes) + RNF-07 (respaldo) + ensayo con datos simulados (§12 paso 5). */
@Component({
  selector: 'app-reportes',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Reportes y respaldo</h1>
        <p>Exporta el consolidado y guarda copias de los datos durante la jornada.</p>
      </div>
    </div>

    <div class="grid">
      <section class="panel">
        <div class="panel__head"><h2>Reporte de resultados</h2></div>
        <div class="panel__body stack">
          <p class="muted">Consolidado por candidato y detalle por acta, con {{ data.consolidado().actasContabilizadas }} actas contabilizadas.</p>
          <div class="row">
            <button type="button" class="btn btn--primary" [disabled]="ocupado()" (click)="exportar('excel')"><app-icon name="download" /> Excel (.xlsx)</button>
            <button type="button" class="btn" [disabled]="ocupado()" (click)="exportar('pdf')"><app-icon name="file" /> PDF</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head"><h2>Respaldo</h2></div>
        <div class="panel__body stack">
          <p class="muted">
            La base de datos se respalda sola en el servidor cada 10 minutos (pg_dump).
            Además puedes descargar ahora una copia completa en JSON: actas, locales, usuarios (sin contraseñas) y auditoría.
          </p>
          <div class="row">
            <button type="button" class="btn btn--primary" [disabled]="ocupado()" (click)="respaldo()"><app-icon name="download" /> Descargar respaldo JSON</button>
          </div>
        </div>
      </section>

      @if (auth.esAdmin()) {
        <section class="panel">
          <div class="panel__head"><h2>Ensayo con datos simulados</h2></div>
          <div class="panel__body stack">
            <p class="muted">Genera actas de prueba (N° SIM-xxxxx) para ensayar la digitación y el tablero. Bórralas antes de la jornada real y desactiva la simulación en el servidor (SIMULACION=false).</p>
            <div class="row">
              <button type="button" class="btn" [disabled]="ocupado()" (click)="simular(10)"><app-icon name="flask" /> Generar 10</button>
              <button type="button" class="btn" [disabled]="ocupado()" (click)="simular(5000)">Llenar todas las mesas</button>
              <button type="button" class="btn btn--danger" [disabled]="ocupado()" (click)="borrarSim()"><app-icon name="trash" /> Borrar simuladas</button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
    .stack { display: grid; gap: 16px; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class ReportesComponent {
  data = inject(DataService);
  exp = inject(ExportService);
  auth = inject(AuthService);
  private toast = inject(ToastService);
  ocupado = signal(false);

  async exportar(tipo: 'excel' | 'pdf') {
    await this.trabajo(async () => {
      await this.data.cargarActas();
      await (tipo === 'excel' ? this.exp.excel() : this.exp.pdf());
    });
  }

  async respaldo() {
    await this.trabajo(async () => {
      await this.exp.respaldoJson();
      this.toast.ok('Respaldo descargado.');
    });
  }

  async simular(n: number) {
    await this.trabajo(async () => {
      const r = await this.data.generarSimulacion(n);
      if (!r.ok) return this.toast.error(r.errores[0]);
      r.valor.cantidad ? this.toast.ok(`${r.valor.cantidad} actas simuladas generadas.`) : this.toast.info('No quedan mesas libres para simular.');
    });
  }

  async borrarSim() {
    if (!confirm('¿Borrar todas las actas simuladas (SIM-)?')) return;
    await this.trabajo(async () => {
      const r = await this.data.borrarActasSimuladas();
      if (!r.ok) return this.toast.error(r.errores[0]);
      this.toast.ok(r.valor.cantidad ? `${r.valor.cantidad} actas simuladas eliminadas.` : 'No había actas simuladas.');
    });
  }

  private async trabajo(f: () => Promise<void>) {
    this.ocupado.set(true);
    try {
      await f();
    } catch (e) {
      this.toast.error(mensaje(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
