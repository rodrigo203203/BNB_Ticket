/**
 * Zona horaria de referencia para plazos de solicitudes (sede BNB, Bolivia).
 * La comparación de "hoy" vs fecha requerida usa el día calendario en esta zona,
 * no el fin del día UTC, para alinear reglas de negocio con horario local.
 */
export const ZONA_FECHA_SOLICITUD = 'America/La_Paz';

/** Devuelve YYYY-MM-DD del instante en la zona indicada (formato en-CA). */
export function obtenerDiaCalendarioEnZona(
  fecha: Date,
  timeZone: string = ZONA_FECHA_SOLICITUD,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

/** Mes calendario YYYY-MM en la zona de solicitudes. */
export function obtenerMesCalendarioEnZona(
  fecha: Date,
  timeZone: string = ZONA_FECHA_SOLICITUD,
): string {
  return obtenerDiaCalendarioEnZona(fecha, timeZone).slice(0, 7);
}

/**
 * Regla T6: la fecha requerida debe ser estrictamente posterior a hoy
 * (primer día permitido = mañana en calendario America/La_Paz).
 */
export function esFechaRequeridaPosteriorAHoy(iso: string, ahora: Date = new Date()): boolean {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const diaRequerido = obtenerDiaCalendarioEnZona(parsed);
  const diaHoy = obtenerDiaCalendarioEnZona(ahora);
  return diaRequerido > diaHoy;
}

export type EstadoPlazoSolicitud = 'a_tiempo' | 'atraso';

/**
 * Compara fecha de entrega (si existe) o la fecha actual frente a fecha requerida.
 * Mismo criterio de día calendario en America/La_Paz.
 */
export function evaluarEstadoPlazo(
  fechaRequeridaIso: string,
  fechaEntregaIso: string | null,
  ahora: Date = new Date(),
): EstadoPlazoSolicitud {
  const diaRequerido = obtenerDiaCalendarioEnZona(new Date(fechaRequeridaIso));
  const diaReferencia = fechaEntregaIso
    ? obtenerDiaCalendarioEnZona(new Date(fechaEntregaIso))
    : obtenerDiaCalendarioEnZona(ahora);
  return diaReferencia <= diaRequerido ? 'a_tiempo' : 'atraso';
}

/** Etiqueta UI para el estado de plazo. */
export function etiquetaEstadoPlazo(
  fechaRequeridaIso: string,
  fechaEntregaIso: string | null,
  ahora?: Date,
): string {
  return evaluarEstadoPlazo(fechaRequeridaIso, fechaEntregaIso, ahora) === 'a_tiempo'
    ? 'A tiempo'
    : 'Atraso';
}

/** Serializa una fecha de calendario (DatePicker) a ISO estable para la API. */
export function fechaCalendarioToIso(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T12:00:00.000Z`;
}