import { EquipoCargaPersonaRow, NivelCarga, Role } from '@bnb/shared';

export type FiltrosCargaEquipo = {
  rol: Role | null;
  area: string | null;
  nivel: NivelCarga | null;
  orden: 'desc' | 'asc';
};

export function filtrarPersonasCarga(
  personas: EquipoCargaPersonaRow[],
  filtros: FiltrosCargaEquipo,
): EquipoCargaPersonaRow[] {
  let filas = [...personas];
  if (filtros.rol) {
    filas = filas.filter((p) => p.role === filtros.rol);
  }
  if (filtros.area) {
    filas = filas.filter((p) => p.area === filtros.area);
  }
  if (filtros.nivel) {
    filas = filas.filter((p) => p.nivel === filtros.nivel);
  }
  filas.sort((a, b) =>
    filtros.orden === 'desc' ? b.puntosCarga - a.puntosCarga : a.puntosCarga - b.puntosCarga,
  );
  return filas;
}