import {
  RequestPriority,
  RequestStatus,
  esActivaParaCarga,
  esPorVencerVistaCarga,
  esVencidaVistaCarga,
  nivelCargaPorPuntos,
  resumirCargaDesdeSolicitudes,
} from '@bnb/shared';

const ahora = new Date('2026-06-15T15:00:00.000Z');

function fila(partial: {
  status: RequestStatus;
  priority?: RequestPriority;
  fechaRequerida?: string | null;
  fechaEntrega?: string | null;
  assignedAnalystId?: string | null;
}) {
  return {
    status: partial.status,
    priority: partial.priority ?? RequestPriority.MEDIA,
    fechaRequerida: partial.fechaRequerida ?? null,
    fechaEntrega: partial.fechaEntrega ?? null,
    assignedAnalystId:
      Object.prototype.hasOwnProperty.call(partial, 'assignedAnalystId')
        ? partial.assignedAnalystId ?? null
        : 'u1',
  };
}

describe('carga equipo (boceto 04)', () => {
  it('umbrales de nivel en los límites 10/11 y 20/21', () => {
    expect(nivelCargaPorPuntos(10)).toBe('baja');
    expect(nivelCargaPorPuntos(11)).toBe('media');
    expect(nivelCargaPorPuntos(20)).toBe('media');
    expect(nivelCargaPorPuntos(21)).toBe('alta');
  });

  it('REGISTRADA solo activa con encargado', () => {
    expect(
      esActivaParaCarga(fila({ status: RequestStatus.REGISTRADA, assignedAnalystId: null })),
    ).toBe(false);
    expect(
      esActivaParaCarga(fila({ status: RequestStatus.REGISTRADA, assignedAnalystId: 'x' })),
    ).toBe(true);
  });

  it('vencida vista carga: sin entrega y fecha requerida pasada', () => {
    const s = fila({
      status: RequestStatus.EN_ANALISIS,
      fechaRequerida: '2026-06-01T12:00:00.000Z',
      fechaEntrega: null,
    });
    expect(esVencidaVistaCarga(s, ahora)).toBe(true);
  });

  it('no vencida en vista carga si ya hay entrega (aunque sea tarde — dashboard T8 sí la cuenta)', () => {
    const s = fila({
      status: RequestStatus.EN_ANALISIS,
      fechaRequerida: '2026-06-01T12:00:00.000Z',
      fechaEntrega: '2026-06-20T12:00:00.000Z',
    });
    expect(esVencidaVistaCarga(s, ahora)).toBe(false);
  });

  it('por vencer: ≤3 días naturales sin entrega', () => {
    const s = fila({
      status: RequestStatus.EN_ANALISIS,
      fechaRequerida: '2026-06-17T12:00:00.000Z',
      fechaEntrega: null,
    });
    expect(esPorVencerVistaCarga(s, ahora)).toBe(true);
  });

  it('puntos por prioridad en activas', () => {
    const res = resumirCargaDesdeSolicitudes(
      [
        fila({ status: RequestStatus.EN_ANALISIS, priority: RequestPriority.BAJA }),
        fila({ status: RequestStatus.EN_ANALISIS, priority: RequestPriority.URGENTE }),
      ],
      ahora,
    );
    expect(res.puntosCarga).toBe(5);
    expect(res.activas).toBe(2);
  });
});