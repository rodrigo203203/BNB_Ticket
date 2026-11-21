import {
  esSolicitudVencida,
  resumirCargaUsuario,
  UMBRAL_POR_VENCER_DIAS_NATURALES,
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
    const res = resumirCargaUsuario(
      [
        {
          status: RequestStatus.EN_ANALISIS,
          fechaRequerida: '2030-01-01T12:00:00.000Z',
          fechaEntrega: null,
        },
      ],
      new Date('2026-01-01T12:00:00.000Z'),
    );
    expect(res.activas).toBe(1);
    expect(res.indicador).toBe('baja');
    expect(UMBRAL_POR_VENCER_DIAS_NATURALES).toBe(3);
  });
});