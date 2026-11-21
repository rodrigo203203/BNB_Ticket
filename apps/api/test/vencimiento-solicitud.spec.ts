import {
  esSolicitudVencida,
  ESTADOS_ACTIVOS_VENCIMIENTO,
  RequestStatus,
} from '@bnb/shared';

describe('esSolicitudVencida (Spark B7 — única fuente)', () => {
  const medianocheUtcNov21 = new Date('2026-11-21T03:30:00.000Z');

  it('medianoche UTC: activa sin entrega y requerida ayer (La Paz) es vencida', () => {
    expect(
      esSolicitudVencida(
        {
          status: RequestStatus.EN_ANALISIS,
          fechaRequerida: '2026-11-19T12:00:00.000Z',
          fechaEntrega: null,
        },
        medianocheUtcNov21,
      ),
    ).toBe(true);
  });

  it('rechazada y cancelada nunca vencen', () => {
    const antigua = { fechaRequerida: '2020-01-01T12:00:00.000Z', fechaEntrega: null as null };
    expect(esSolicitudVencida({ status: RequestStatus.RECHAZADA, ...antigua })).toBe(false);
    expect(esSolicitudVencida({ status: RequestStatus.CANCELADA, ...antigua })).toBe(false);
  });

  it('entregada a tiempo no vence', () => {
    expect(
      esSolicitudVencida({
        status: RequestStatus.APROBADA,
        fechaRequerida: '2026-12-10T12:00:00.000Z',
        fechaEntrega: '2026-12-09T12:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('entregada tarde cuenta como vencida', () => {
    expect(
      esSolicitudVencida({
        status: RequestStatus.APROBADA,
        fechaRequerida: '2026-12-10T12:00:00.000Z',
        fechaEntrega: '2026-12-11T12:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('activa con compromiso de entrega vencido extiende referencia a hoy (N8)', () => {
    expect(
      esSolicitudVencida(
        {
          status: RequestStatus.EN_ANALISIS,
          fechaRequerida: '2026-11-10T12:00:00.000Z',
          fechaEntrega: '2026-11-19T12:00:00.000Z',
        },
        medianocheUtcNov21,
      ),
    ).toBe(true);
  });

  it('estados activos incluyen los tres del boceto', () => {
    expect(ESTADOS_ACTIVOS_VENCIMIENTO).toEqual(
      expect.arrayContaining([
        RequestStatus.REGISTRADA,
        RequestStatus.EN_ANALISIS,
        RequestStatus.EN_REVISION_COORDINACION,
      ]),
    );
  });
});