import {
  esFechaRequeridaPosteriorAHoy,
  evaluarEstadoPlazo,
  inicioDiaHoyLaPaz,
  instanteCalendarioLaPaz,
  obtenerDiaCalendarioEnZona,
  ZONA_FECHA_SOLICITUD,
} from '@bnb/shared';

describe('fechas-solicitud (America/La_Paz)', () => {
  it('obtiene día calendario en zona Bolivia', () => {
    const dia = obtenerDiaCalendarioEnZona(new Date('2026-06-15T12:00:00.000Z'), ZONA_FECHA_SOLICITUD);
    expect(dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rechaza fecha requerida igual a hoy', () => {
    const hoy = new Date();
    const isoHoy = `${obtenerDiaCalendarioEnZona(hoy)}T12:00:00.000Z`;
    expect(esFechaRequeridaPosteriorAHoy(isoHoy, hoy)).toBe(false);
  });

  it('acepta fecha requerida futura', () => {
    const hoy = new Date();
    expect(esFechaRequeridaPosteriorAHoy('2030-06-01T12:00:00.000Z', hoy)).toBe(true);
  });

  it('evalúa a tiempo cuando entrega no supera requerida', () => {
    expect(
      evaluarEstadoPlazo('2026-12-10T12:00:00.000Z', '2026-12-09T12:00:00.000Z'),
    ).toBe('a_tiempo');
  });

  it('evalúa atraso cuando entrega supera requerida', () => {
    expect(
      evaluarEstadoPlazo('2026-12-10T12:00:00.000Z', '2026-12-11T12:00:00.000Z'),
    ).toBe('atraso');
  });

  it('cerca de medianoche UTC: «hoy» sigue siendo el día La Paz (no el día UTC)', () => {
    /** 03:30Z del 21/11 = 23:30 del 20/11 en La Paz (UTC−4). */
    const instante = new Date('2026-11-21T03:30:00.000Z');
    expect(obtenerDiaCalendarioEnZona(instante)).toBe('2026-11-20');
    expect(inicioDiaHoyLaPaz(instante)).toBe(instanteCalendarioLaPaz('2026-11-20T12:00:00.000Z'));
    expect(instanteCalendarioLaPaz('2026-11-21T03:30:00.000Z')).toBe(
      instanteCalendarioLaPaz('2026-11-20T12:00:00.000Z'),
    );
  });
});