import { esSolicitudVencida, RequestStatus } from '@bnb/shared';

describe('Gantt — flag vencida (misma regla que dashboard)', () => {
  it('marca vencida sin entrega y fecha requerida pasada', () => {
    expect(
      esSolicitudVencida({
        status: RequestStatus.EN_ANALISIS,
        fechaRequerida: '2020-01-01T12:00:00.000Z',
        fechaEntrega: null,
      }),
    ).toBe(true);
  });

  it('rechazada y cancelada nunca vencen', () => {
    expect(
      esSolicitudVencida({
        status: RequestStatus.RECHAZADA,
        fechaRequerida: '2020-01-01T12:00:00.000Z',
        fechaEntrega: null,
      }),
    ).toBe(false);
    expect(
      esSolicitudVencida({
        status: RequestStatus.CANCELADA,
        fechaRequerida: '2020-01-01T12:00:00.000Z',
        fechaEntrega: null,
      }),
    ).toBe(false);
  });
});