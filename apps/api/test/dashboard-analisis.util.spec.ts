import { computarAnalisisDesdeSolicitudes } from '../src/modules/dashboard/dashboard-analisis.util';
import { RequestCategory, RequestStatus } from '@bnb/shared';

describe('dashboard analisis (T8)', () => {
  const ahora = new Date('2026-06-15T15:00:00.000Z');

  it('separa rechazadas y canceladas', () => {
    const stats = computarAnalisisDesdeSolicitudes(
      [
        {
          status: RequestStatus.RECHAZADA,
          category: RequestCategory.REPORTES_BI,
          fechaRequerida: null,
          fechaEntrega: null,
          closedAt: new Date('2026-05-01T12:00:00.000Z'),
        },
        {
          status: RequestStatus.CANCELADA,
          category: RequestCategory.CALIDAD_DATOS,
          fechaRequerida: null,
          fechaEntrega: null,
          closedAt: new Date('2026-05-02T12:00:00.000Z'),
        },
      ],
      ahora,
    );
    expect(stats.resumen.rechazadas).toBe(1);
    expect(stats.resumen.canceladas).toBe(1);
  });

  it('completadasMes usa closedAt en mes calendario La Paz', () => {
    const stats = computarAnalisisDesdeSolicitudes(
      [
        {
          status: RequestStatus.APROBADA,
          category: RequestCategory.ACCESO_BD,
          fechaRequerida: null,
          fechaEntrega: new Date('2026-06-10T12:00:00.000Z'),
          closedAt: new Date('2026-06-14T12:00:00.000Z'),
        },
        {
          status: RequestStatus.APROBADA,
          category: RequestCategory.ACCESO_BD,
          fechaRequerida: null,
          fechaEntrega: null,
          closedAt: new Date('2026-05-20T12:00:00.000Z'),
        },
      ],
      ahora,
    );
    expect(stats.resumen.completadasMes).toBe(1);
  });
});