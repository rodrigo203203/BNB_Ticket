import {
  computarAnalisisDesdeSolicitudes,
  resolverVentanaAnalisis,
} from '../src/modules/dashboard/dashboard-analisis.util';
import { RequestCategory, RequestStatus } from '@bnb/shared';

describe('dashboard analisis Spark B1', () => {
  const ahora = new Date('2026-06-15T15:00:00.000Z');
  const ventana = resolverVentanaAnalisis({ period: '30d' }, ahora);

  it('expone KPIs con forma DashboardAnalisisStats', () => {
    const stats = computarAnalisisDesdeSolicitudes(
      [
        {
          status: RequestStatus.REGISTRADA,
          category: RequestCategory.REPORTES_BI,
          fechaRequerida: new Date('2026-06-20T12:00:00.000Z'),
          fechaEntrega: null,
          closedAt: null,
          requesterArea: 'Riesgos',
          createdAt: new Date('2026-06-10T12:00:00.000Z'),
          assignedAnalystId: 'a1',
          assignedAnalystName: 'Ana',
        },
      ],
      ventana,
      ahora,
    );
    expect(stats.resumen.solicitudesPeriodo).toHaveProperty('valor');
    expect(stats.resumen.solicitudesPeriodo).toHaveProperty('deltaVsPeriodoAnterior');
    expect(stats.porAreaRequester[0]?.area).toBe('Riesgos');
  });

  it('calcula entregas a tiempo vs con atraso', () => {
    const stats = computarAnalisisDesdeSolicitudes(
      [
        {
          status: RequestStatus.APROBADA,
          category: RequestCategory.ACCESO_BD,
          fechaRequerida: new Date('2026-06-12T12:00:00.000Z'),
          fechaEntrega: new Date('2026-06-11T12:00:00.000Z'),
          closedAt: new Date('2026-06-11T15:00:00.000Z'),
          requesterArea: 'Cartera',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          assignedAnalystId: 'a1',
          assignedAnalystName: 'Ana',
        },
        {
          status: RequestStatus.APROBADA,
          category: RequestCategory.ACCESO_BD,
          fechaRequerida: new Date('2026-06-05T12:00:00.000Z'),
          fechaEntrega: new Date('2026-06-08T12:00:00.000Z'),
          closedAt: new Date('2026-06-08T12:00:00.000Z'),
          requesterArea: 'Cartera',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          assignedAnalystId: 'a1',
          assignedAnalystName: 'Ana',
        },
      ],
      ventana,
      ahora,
    );
    expect(stats.entregaPlazo.aTiempo).toBeGreaterThanOrEqual(1);
    expect(stats.entregaPlazo.conAtraso).toBeGreaterThanOrEqual(1);
  });
});