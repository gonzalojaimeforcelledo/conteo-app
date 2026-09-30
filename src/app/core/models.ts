/**
 * Contratos de la API (espejo de los DTO del backend Spring Boot).
 */

export type Rol = 'ADMIN' | 'SUPERVISOR' | 'DIGITADOR';

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface Candidato {
  id: number;
  nombresCompletos: string;
  partidoPolitico: string;
  ordenLista: number;
  logo: string;
  foto: string;
}

export interface ColegioLocal {
  id: number;
  nombre: string;
  codigo: string;
  distrito: string;
  totalMesas: number;
  actasRegistradas: number;
}

export type EstadoActa = 'PENDIENTE' | 'CONTABILIZADA' | 'OBSERVADA';

export interface Acta {
  id: number;
  numeroActa: string;
  colegioId: number;
  colegioNombre?: string;
  mesa: string;
  totalElectoresHabiles: number;
  totalVotantes: number;
  votos: Record<number, number>;
  votosBlanco: number;
  votosNulosViciados: number;
  estado: EstadoActa;
  observacion?: string;
  registradoPor: string;
  fechaRegistro: string;
  actualizadoPor?: string;
  fechaActualizacion?: string;
  version: number;
}

/** Cuerpo de POST/PUT /api/actas */
export interface ActaBorrador {
  numeroActa: string;
  colegioId: number | null;
  mesa: string;
  totalElectoresHabiles: number;
  totalVotantes: number;
  votos: Record<number, number>;
  votosBlanco: number;
  votosNulosViciados: number;
  estado: EstadoActa;
  observacion?: string;
  version?: number;
}

export interface LogAuditoria {
  id: number;
  usuario: string;
  accion: string;
  entidad: 'ACTA' | 'COLEGIO' | 'USUARIO' | 'SISTEMA';
  entidadId?: number;
  fecha: string;
  detalle: string;
}

export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface ResultadoCandidato {
  candidato: Candidato;
  votos: number;
  porcentaje: number;
  posicion: number;
}

export interface Consolidado {
  resultados: ResultadoCandidato[];
  votosValidos: number;
  votosBlanco: number;
  votosNulos: number;
  votosEmitidos: number;
  electoresHabiles: number;
  actasContabilizadas: number;
  actasObservadas: number;
  actasPendientes: number;
  actasEsperadas: number;
  porcentajeActas: number;
  participacion: number;
  ultimaActualizacion?: string | null;
}

export interface Sesion {
  token: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  expira: number;
}

export interface ErrorApi {
  estado: number;
  mensaje: string;
  errores: string[];
}
