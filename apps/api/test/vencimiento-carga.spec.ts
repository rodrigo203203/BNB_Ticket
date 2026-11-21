import {
  esSolicitudVencida,
  resumirCargaDesdeSolicitudes,
  UMBRAL_POR_VENCER_DIAS_NATURALES,
  RequestPriority,
} from '@bnb/shared';
import { RequestStatus } from '@bnb/shared';

describe('vencimiento y carga (T8/T9b)', () => {
  it('rechazada no es vencida', () => {
    expect(
      esSolicitudVencida({
        status: RequestStatus.RECHAZADA,
        fechaRequerida: '2020-01-01T12:00:00.000Z',
        fechaEntrega: null,
      }),
    ).toBe(false);
  });

  it('resume carga con indicador', () => {
    const res = resumirCargaDesdeSolicitudes(
      [
        {
          status: RequestStatus.EN_ANALISIS,
          priority: RequestPriority.MEDIA,
          fechaRequerida: '2030-01-01T12:00:00.000Z',
          fechaEntrega: null,
          assignedAnalystId: 'u1',
        },
      ],
      new Date('2026-01-01T12:00:00.000Z'),
    );
    expect(res.activas).toBe(1);
    expect(res.nivel).toBe('baja');
    expect(UMBRAL_POR_VENCER_DIAS_NATURALES).toBe(3);
  });
});