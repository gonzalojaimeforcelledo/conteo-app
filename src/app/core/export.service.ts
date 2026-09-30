import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';
import { descargar, fmtFecha, num, sumaVotos } from './util';

/** RF-11: reportes exportables. Las librerías se cargan bajo demanda. */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private data = inject(DataService);

  private sello(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  private filasActas() {
    const cands = this.data.candidatos();
    return this.data.actas().map((a) => {
      const fila: Record<string, string | number> = {
        'N° acta': a.numeroActa,
        'Local de votación': (a.colegioNombre ?? this.data.nombreColegio(a.colegioId)),
        Mesa: a.mesa,
        Estado: a.estado,
        'Electores hábiles': a.totalElectoresHabiles,
        Votantes: a.totalVotantes,
      };
      for (const c of cands) fila[c.partidoPolitico] = num(a.votos[c.id]);
      fila['Blancos'] = a.votosBlanco;
      fila['Nulos/viciados'] = a.votosNulosViciados;
      fila['Suma'] = sumaVotos(a);
      fila['Registrado por'] = a.registradoPor;
      fila['Fecha registro'] = fmtFecha(a.fechaRegistro);
      fila['Última edición'] = a.fechaActualizacion ? `${a.actualizadoPor} ${fmtFecha(a.fechaActualizacion)}` : '';
      fila['Observación'] = a.observacion ?? '';
      return fila;
    });
  }

  async excel(): Promise<void> {
    const XLSX = await import('xlsx');
    const c = this.data.consolidado();
    const wb = XLSX.utils.book_new();

    const resumen = [
      ['Conteo paralelo de actas — Alcaldía de Pueblo Nuevo 2026'],
      ['Generado', fmtFecha(new Date().toISOString())],
      ['Actas contabilizadas', `${c.actasContabilizadas} de ${c.actasEsperadas} (${c.porcentajeActas}%)`],
      [],
      ['Puesto', 'Candidato', 'Organización política', 'Votos', '% votos válidos'],
      ...c.resultados.map((r) => [r.posicion + 1, r.candidato.nombresCompletos, r.candidato.partidoPolitico, r.votos, r.porcentaje]),
      [],
      ['', 'Votos válidos', '', c.votosValidos],
      ['', 'Votos en blanco', '', c.votosBlanco],
      ['', 'Votos nulos / viciados', '', c.votosNulos],
      ['', 'Votos emitidos', '', c.votosEmitidos],
      [],
      ['Conteo informativo. El resultado oficial corresponde a ONPE / JNE.'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumen);
    ws1['!cols'] = [{ wch: 8 }, { wch: 36 }, { wch: 32 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Consolidado');

    const ws2 = XLSX.utils.json_to_sheet(this.filasActas());
    XLSX.utils.book_append_sheet(wb, ws2, 'Por acta');

    const ws3 = XLSX.utils.json_to_sheet(
      this.data.colegios().map((col) => ({
        Código: col.codigo, Local: col.nombre, Distrito: col.distrito, Mesas: col.totalMesas,
        'Actas registradas': col.actasRegistradas,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws3, 'Locales');

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    descargar(`conteo-pueblo-nuevo-${this.sello()}.xlsx`, out, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    this.data.registrarExportacion('Excel');
  }

  /** Carga los logos como data URL para incrustarlos en el PDF. */
  private async logos(): Promise<Map<number, string>> {
    const m = new Map<number, string>();
    await Promise.all(this.data.candidatos().map(async (c) => {
      try {
        const blob = await (await fetch(c.logo)).blob();
        const url = await new Promise<string>((ok, err) => {
          const r = new FileReader();
          r.onload = () => ok(String(r.result));
          r.onerror = err;
          r.readAsDataURL(blob);
        });
        m.set(c.id, url);
      } catch { /* sin logo: se omite */ }
    }));
    return m;
  }

  async pdf(): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const logos = await this.logos();
    const autoTable = (await import('jspdf-autotable')).default;
    const c = this.data.consolidado();
    const rojo: [number, number, number] = [200, 16, 46];
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(...rojo);
    doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Conteo paralelo de actas: Alcaldía de Pueblo Nuevo 2026', 36, 30);
    doc.setFontSize(10);
    doc.text(`Generado ${fmtFecha(new Date().toISOString())}  |  Actas contabilizadas ${c.actasContabilizadas} de ${c.actasEsperadas} (${c.porcentajeActas}%)`, 36, 48);

    autoTable(doc, {
      startY: 84,
      head: [['#', '', 'Candidato', 'Organización política', 'Votos', '% válidos']],
      body: c.resultados.map((r) => [r.posicion + 1, '', r.candidato.nombresCompletos, r.candidato.partidoPolitico, r.votos.toLocaleString('es-PE'), `${r.porcentaje.toFixed(2)} %`]),
      foot: [
        ['', '', 'Votos válidos', '', c.votosValidos.toLocaleString('es-PE'), ''],
        ['', '', 'Blancos', '', c.votosBlanco.toLocaleString('es-PE'), ''],
        ['', '', 'Nulos / viciados', '', c.votosNulos.toLocaleString('es-PE'), ''],
        ['', '', 'Emitidos', '', c.votosEmitidos.toLocaleString('es-PE'), ''],
      ],
      bodyStyles: { minCellHeight: 30, valign: 'middle' },
      didDrawCell: (d: any) => {
        if (d.section !== 'body' || d.column.index !== 1) return;
        const img = logos.get(c.resultados[d.row.index]?.candidato.id);
        if (img) doc.addImage(img, 'PNG', d.cell.x + 4, d.cell.y + 3, 24, 24);
      },
      headStyles: { fillColor: rojo },
      footStyles: { fillColor: [245, 245, 245], textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 32 }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      styles: { fontSize: 10 },
    });

    doc.addPage();
    const cands = this.data.candidatos();
    autoTable(doc, {
      startY: 36,
      head: [['N° acta', 'Local', 'Mesa', 'Estado', ...cands.map((x) => `C${x.ordenLista}`), 'Bl.', 'Nul.', 'Suma']],
      body: this.data.actas().map((a) => [
        a.numeroActa, (a.colegioNombre ?? this.data.nombreColegio(a.colegioId)), a.mesa, a.estado,
        ...cands.map((x) => num(a.votos[x.id])), a.votosBlanco, a.votosNulosViciados, sumaVotos(a),
      ]),
      headStyles: { fillColor: rojo },
      styles: { fontSize: 7 },
    });
    const y = (doc as any).lastAutoTable.finalY + 16;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(cands.map((x) => `C${x.ordenLista}: ${x.partidoPolitico}`).join('   '), 36, y, { maxWidth: W - 72 });
    doc.text('Conteo informativo. El resultado oficial corresponde a ONPE / JNE.', 36, y + 24);

    doc.save(`conteo-pueblo-nuevo-${this.sello()}.pdf`);
    this.data.registrarExportacion('PDF');
  }

  /** Exportación completa desde el servidor (el servidor registra la auditoría). */
  async respaldoJson(): Promise<void> {
    const r = await this.data.respaldo();
    descargar(`respaldo-pueblo-nuevo-${this.sello()}.json`, JSON.stringify(r, null, 2), 'application/json');
  }
}
