import { describe, expect, it } from 'vitest';
import { Role, NivelCarga, type EquipoCargaPersonaRow } from '@bnb/shared';
import { filtrarPersonasCarga } from './carga-filtros.util';

const baseRow = (over: Partial<EquipoCargaPersonaRow>): EquipoCargaPersonaRow => ({
  id: '1',
  fullName: 'A',
  email: 'a@b.bo',
  role: Role.ANALISTA,
  area: 'TI',
  puntosCarga: 10,
  nivel: 'media',
  activas: 2,
  porEstado: {},
  vencidas: 0,
  porVencer: 0,
  proximaFechaEntrega: null,
  proximaSolicitudCodigo: null,
  proximaSolicitudId: null,
  ...over,
});

describe('filtrarPersonasCarga', () => {
  const personas = [
    baseRow({ id: 'r', fullName: 'Rodrigo', puntosCarga: 30, area: 'TI', nivel: 'alta' }),
    baseRow({ id: 'm', fullName: 'Mariana', puntosCarga: 5, area: 'Finanzas', nivel: 'baja' }),
  ];

  it('sin filtros devuelve todos ordenados desc', () => {
    const r = filtrarPersonasCarga(personas, { rol: null, area: null, nivel: null, orden: 'desc' });
    expect(r.map((p) => p.id)).toEqual(['r', 'm']);
  });

  it('filtra por área', () => {
    const r = filtrarPersonasCarga(personas, {
      rol: null,
      area: 'Finanzas',
      nivel: null,
      orden: 'desc',
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.fullName).toBe('Mariana');
  });

  it('filtra por nivel', () => {
    const r = filtrarPersonasCarga(personas, {
      rol: null,
      area: null,
      nivel: 'alta' as NivelCarga,
      orden: 'asc',
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.nivel).toBe('alta');
  });
});