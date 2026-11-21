import { RequestStatus } from '../enums/index.js';
import { obtenerDiaCalendarioEnZona } from './fechas-solicitud.js';

/**
 * Rechazada y cancelada nunca cuentan como vencidas (regla boceto 2).
 */
export function estadosExcluidosVencimiento(): RequestStatus[] {
  return [RequestStatus.RECHAZADA, RequestStatus.CANCELADA];
}

export type SolicitudParaVencimiento = {
  status: RequestStatus;
  fechaRequerida: Date | string | null;
  fechaEntrega: Date | string | null;
};

/**
 * Vencida (dashboard T8 / análisis operativo): entregada después de la fecha requerida,
 * o sin entregar con fecha requerida ya pasada.
 * La vista **Carga del equipo** (T9b) usa `esVencidaVistaCarga` (solo sin entrega).
 */
export function esSolicitudVencida(
  s: SolicitudParaVencimiento,
  ahora: Date = new Date(),
): boolean {
  if (estadosExcluidosVencimiento().includes(s.status)) {
    return false;
  }
  if (!s.fechaRequerida) {
    return false;
  }
  const diaReq = obtenerDiaCalendarioEnZona(new Date(s.fechaRequerida));
  const diaRef = s.fechaEntrega
    ? obtenerDiaCalendarioEnZona(new Date(s.fechaEntrega))
    : obtenerDiaCalendarioEnZona(ahora);
  return diaRef > diaReq;
}

/** Días naturales hasta la fecha requerida (negativo = ya pasó). */
export function diasHastaFechaRequerida(fechaRequerida: Date | string, ahora: Date = new Date()): number {
  const diaReq = obtenerDiaCalendarioEnZona(new Date(fechaRequerida));
  const diaHoy = obtenerDiaCalendarioEnZona(ahora);
  const tReq = new Date(`${diaReq}T12:00:00.000Z`).getTime();
  const tHoy = new Date(`${diaHoy}T12:00:00.000Z`).getTime();
  return Math.round((tReq - tHoy) / 86_400_000);
}

/** Por vencer: no vencida, con fecha requerida dentro del umbral (días naturales). */
export function esSolicitudPorVencer(
  s: SolicitudParaVencimiento,
  umbralDiasNaturales: number,
  ahora: Date = new Date(),
): boolean {
  if (esSolicitudVencida(s, ahora) || !s.fechaRequerida) return false;
  const dias = diasHastaFechaRequerida(s.fechaRequerida, ahora);
  return dias >= 0 && dias <= umbralDiasNaturales;
}