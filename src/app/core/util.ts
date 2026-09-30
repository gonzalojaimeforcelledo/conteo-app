export const uid = (): string =>
  (crypto as any).randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

export const ahora = (): string => new Date().toISOString();

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function sumaCandidatos(votos: Record<number, number>): number {
  return Object.values(votos).reduce((s, v) => s + num(v), 0);
}

export function sumaVotos(a: { votos: Record<number, number>; votosBlanco: number; votosNulosViciados: number }): number {
  return sumaCandidatos(a.votos) + num(a.votosBlanco) + num(a.votosNulosViciados);
}

export function pct(parte: number, total: number, dec = 2): number {
  if (!total) return 0;
  const f = 10 ** dec;
  return Math.round((parte / total) * 100 * f) / f;
}

export function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });
}

export function fmtHora(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function descargar(nombre: string, contenido: BlobPart, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[p.length - 2]?.[0] ?? p[1]?.[0] ?? '')).toUpperCase();
}
