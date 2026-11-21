import { nivelCargaPorPuntos, resumirCargaDesdeSolicitudes, RequestPriority } from '@bnb/shared';
import { RequestStatus } from '@bnb/shared';

describe('assignable carga orden', () => {
  it('orden ascendente por puntosCarga', () => {
    const a = resumirCargaDesdeSolicitudes([
      {
        status: RequestStatus.EN_ANALISIS,
        priority: RequestPriority.URGENTE,
        fechaRequerida: null,
        fechaEntrega: null,
        assignedAnalystId: '1',
      },
      {
        status: RequestStatus.EN_ANALISIS,
        priority: RequestPriority.URGENTE,
        fechaRequerida: null,
        fechaEntrega: null,
        assignedAnalystId: '1',
      },
    ]);
    const b = resumirCargaDesdeSolicitudes([]);
    expect(a.puntosCarga).toBeGreaterThan(b.puntosCarga);
    expect(nivelCargaPorPuntos(a.puntosCarga)).toBeDefined();
  });
});