import { Candidato, ColegioLocal, Rol } from './models';

/** Catálogo fijo de candidatos (SRS §5). No editable desde la UI. */
export const CANDIDATOS: Candidato[] = [
  { id: 1, ordenLista: 1, nombresCompletos: 'Angel Jonathan Vega Valentin',      partidoPolitico: 'Progresemos', logo: 'logos/progresemos.png', foto: 'candidatos/progresemos.jpg' },
  { id: 2, ordenLista: 2, nombresCompletos: 'Anthony Erick Niebuhr Herrera',     partidoPolitico: 'Acción Popular', logo: 'logos/accion-popular.png', foto: 'candidatos/accion-popular.jpg' },
  { id: 3, ordenLista: 3, nombresCompletos: 'Cesar Camilo Landeo Lopez',         partidoPolitico: 'Partido Popular Cristiano', logo: 'logos/ppc.png', foto: 'candidatos/ppc.jpg' },
  { id: 4, ordenLista: 4, nombresCompletos: 'Edwin Walditradis Aburto Santiago', partidoPolitico: 'Renovación Popular Perú', logo: 'logos/renovacion-popular.png', foto: 'candidatos/renovacion-popular.jpg' },
  { id: 5, ordenLista: 5, nombresCompletos: 'Hebert Amado Quiroz Almeyda',       partidoPolitico: 'Podemos Perú', logo: 'logos/podemos.png', foto: 'candidatos/podemos.jpg' },
  { id: 6, ordenLista: 6, nombresCompletos: 'Jimmy Ulises Mendoza Vasquez',      partidoPolitico: 'Alianza para el Progreso', logo: 'logos/app.png', foto: 'candidatos/app.jpg' },
  { id: 7, ordenLista: 7, nombresCompletos: 'Lucio Juarez Ochoa',                partidoPolitico: 'Partido Democrático Somos Perú', logo: 'logos/somos-peru.png', foto: 'candidatos/somos-peru.jpg' },
  { id: 8, ordenLista: 8, nombresCompletos: 'Pedro Cesar Tasayco Quispe',        partidoPolitico: 'Ahora Nación', logo: 'logos/ahora-nacion.png', foto: 'candidatos/ahora-nacion.jpg' },
];

/**
 * Locales de ejemplo para arrancar. REEMPLÁZALOS por el catálogo real de
 * locales de votación de Pueblo Nuevo desde "Colegios" en el panel.
 */
export const COLEGIOS_EJEMPLO: Omit<ColegioLocal, 'id'>[] = [
  { codigo: 'LV-001', nombre: 'I.E. Local de ejemplo 1', distrito: 'Pueblo Nuevo', totalMesas: 12 },
  { codigo: 'LV-002', nombre: 'I.E. Local de ejemplo 2', distrito: 'Pueblo Nuevo', totalMesas: 8 },
  { codigo: 'LV-003', nombre: 'I.E. Local de ejemplo 3', distrito: 'Pueblo Nuevo', totalMesas: 10 },
];

/** Usuarios iniciales. Cambia las contraseñas antes de la jornada. */
export const USUARIOS_INICIALES: { usuario: string; nombre: string; rol: Rol; password: string }[] = [
  { usuario: 'admin',      nombre: 'Administrador', rol: 'ADMIN',      password: 'admin2026' },
  { usuario: 'supervisor', nombre: 'Supervisor',    rol: 'SUPERVISOR', password: 'super2026' },
  { usuario: 'digitador',  nombre: 'Digitador 1',   rol: 'DIGITADOR',  password: 'digita2026' },
];
