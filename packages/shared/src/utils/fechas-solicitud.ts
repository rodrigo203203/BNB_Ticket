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

const OPCIONES_FECHA_LA_PAZ: Intl.DateTimeFormatOptions = {
  timeZone: ZONA_FECHA_SOLICITUD,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

/** Fecha calendario dd/mm/aaaa en America/La_Paz (Spark M13). */
export function formatearFechaCalendarioLaPaz(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', OPCIONES_FECHA_LA_PAZ).format(d);
}

/** Fecha y hora dd/mm/aaaa HH:mm en America/La_Paz, sin segundos (Spark M13). */
export function formatearFechaHoraLaPaz(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    ...OPCIONES_FECHA_LA_PAZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Marca temporal al mediodía UTC del día calendario actual en La Paz (útil para Gantt M8). */
export function instanteMediodiaCalendarioLaPaz(isoDia: string): number {
  return new Date(`${isoDia}T12:00:00.000Z`).getTime();
}

/** Inicio lógico del día «hoy» en America/La_Paz. */
export function inicioDiaHoyLaPaz(ahora: Date = new Date()): number {
  return instanteMediodiaCalendarioLaPaz(obtenerDiaCalendarioEnZona(ahora));
}

const MS_DIA = 86_400_000;

/** Posición Gantt: ancla al día calendario en La Paz (mediodía UTC estable). */
export function instanteCalendarioLaPaz(iso: string | Date): number {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return Number.NaN;
  return instanteMediodiaCalendarioLaPaz(obtenerDiaCalendarioEnZona(d));
}

/** Desplaza un día calendario YYYY-MM-DD en La Paz. */
export function desplazarDiaCalendarioLaPaz(isoDia: string, deltaDias: number): string {
  const base = instanteMediodiaCalendarioLaPaz(isoDia);
  return obtenerDiaCalendarioEnZona(new Date(base + deltaDias * MS_DIA));
}

/** Lunes de la semana del instante (día calendario La Paz). */
export function inicioSemanaCalendarioLaPaz(refMs: number): number {
  let t = refMs;
  for (let i = 0; i < 7; i++) {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA_FECHA_SOLICITUD,
      weekday: 'short',
    }).format(new Date(t));
    if (weekday === 'Mon') {
      return instanteMediodiaCalendarioLaPaz(obtenerDiaCalendarioEnZona(new Date(t)));
    }
    t -= MS_DIA;
  }
  return refMs;
}

/** Primer día del mes calendario en La Paz. */
export function inicioMesCalendarioLaPaz(refMs: number): number {
  const dia = obtenerDiaCalendarioEnZona(new Date(refMs));
  return instanteMediodiaCalendarioLaPaz(`${dia.slice(0, 7)}-01`);
}

/** Último día del mes calendario en La Paz (fin inclusive = mediodía último día). */
export function finMesCalendarioLaPaz(refMs: number): number {
  const dia = obtenerDiaCalendarioEnZona(new Date(refMs));
  const parts = dia.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const primerSiguiente =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const ultimo = desplazarDiaCalendarioLaPaz(primerSiguiente, -1);
  return instanteMediodiaCalendarioLaPaz(ultimo);
}