import { describe, expect, it } from 'vitest';
import { RequestStatus, type DashboardAnalisisStats } from '@bnb/shared';
import { analisisTieneFuentesDeGraficos } from './dashboard-analisis-charts.util';

describe('analisisTieneFuentesDeGraficos', () => {
  const base: DashboardAnalisisStats = {
    periodo: { clave: '30d', desde: '2026-10-22', hasta: '2026-11-20' },
    areasDisponibles: ['Área A'],
    resumen: {
      solicitudesPeriodo: { valor: 5, deltaVsPeriodoAnterior: 0 },
      tiempoPromedioRespuestaDias: { valor: 4.5, deltaVsPeriodoAnterior: 0 },
      entregadasATiempoPct: { valor: 50, deltaVsPeriodoAnterior: 0 },
      vencidas: { valor: 2, deltaVsPeriodoAnterior: 0 },
      aprobacionesPendientes: { valor: 1, deltaVsPeriodoAnterior: 0 },
    },
    porEstado: {
      [RequestStatus.REGISTRADA]: 2,
      [RequestStatus.EN_ANALISIS]: 1,
      [RequestStatus.EN_REVISION_COORDINACION]: 1,
      [RequestStatus.APROBADA]: 1,
      [RequestStatus.RECHAZADA]: 0,
      [RequestStatus.CANCELADA]: 0,
    },
    porAreaRequester: [{ area: 'Área A', count: 5 }],
    entregaPlazo: { aTiempo: 1, conAtraso: 0 },
    tiempoRespuestaPorMes: [{ mes: '2026-11', promedioDias: 4.5 }],
    cargaPorAnalista: [
      {
        analistaId: 'ana-1',
        analistaNombre: 'Ana',
        porEstado: {
          [RequestStatus.REGISTRADA]: 1,
          [RequestStatus.EN_ANALISIS]: 1,
          [RequestStatus.EN_REVISION_COORDINACION]: 0,
          [RequestStatus.APROBADA]: 0,
          [RequestStatus.RECHAZADA]: 0,
          [RequestStatus.CANCELADA]: 0,
        },
        vencidas: 1,
      },
    ],
    serieMensual: [{ mes: '2026-11', creadas: 3, cerradas: 1, vencidas: 1 }],
  };

  it('acepta payload con datos para todos los gráficos', () => {
    expect(analisisTieneFuentesDeGraficos(base).ok).toBe(true);
  });

  it('falla si porEstado suma cero', () => {
    const vacio = {
      ...base,
      porEstado: {
        ...base.porEstado,
        [RequestStatus.REGISTRADA]: 0,
        [RequestStatus.EN_ANALISIS]: 0,
        [RequestStatus.EN_REVISION_COORDINACION]: 0,
        [RequestStatus.APROBADA]: 0,
      },
    };
    expect(analisisTieneFuentesDeGraficos(vacio).ok).toBe(false);
  });
});