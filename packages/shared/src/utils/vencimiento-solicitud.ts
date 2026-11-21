import { RequestStatus } from '../enums/index.js';
import { obtenerDiaCalendarioEnZona, inicioDiaHoyLaPaz, instanteCalendarioLaPaz } from './fechas-solicitud.js';

/** Estados activos para evaluar vencimiento operativo (boceto 02). */
export const ESTADOS_ACTIVOS_VENCIMIENTO: RequestStatus[] = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
];

/**
 * Rechazada y cancelada nunca cuentan como vencidas (decisión Rodrigo).
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
 * Día de referencia para comparar contra fecha requerida (America/La_Paz).
 * - Activa sin entregar: hoy (o hoy si el compromiso de entrega ya pasó — N8).
 * - Activa con compromiso futuro: día del compromiso.
 * - Cerrada / aprobada: día de entrega declarado.
 */
export function diaReferenciaPlazoVencimiento(
  s: SolicitudParaVencimiento,
  ahora: Date = new Date(),
): string {
  const diaHoy = obtenerDiaCalendarioEnZona(ahora);
  if (ESTADOS_ACTIVOS_VENCIMIENTO.includes(s.status)) {
    if (!s.fechaEntrega) {
      return diaHoy;
    }
    const diaEnt = obtenerDiaCalendarioEnZona(new Date(s.fechaEntrega));
    if (diaHoy > diaEnt) {
      return diaHoy;
    }
    return diaEnt;
  }
  if (s.fechaEntrega) {
    return obtenerDiaCalendarioEnZona(new Date(s.fechaEntrega));
  }
  return diaHoy;
}

/**
 * Vencida (única fuente de verdad — Spark B7):
 * activa sin entregar con fecha requerida pasada, o entregada (referencia) después de la requerida.
 * Rechazada/cancelada: nunca.
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
  const diaRef = diaReferenciaPlazoVencimiento(s, ahora);
  return diaRef > diaReq;
}

const ESTADOS_CERRADOS: RequestStatus[] = [
  RequestStatus.APROBADA,
  RequestStatus.RECHAZADA,
  RequestStatus.CANCELADA,
];

/** Solicitud cerrada (entrega efectiva registrada en flujo, no compromiso en activa). */
export function solicitudEntregadaCerrada(status: RequestStatus): boolean {
  return ESTADOS_CERRADOS.includes(status);
}

/**
 * Fin del tramo rojo en Gantt (N8): activa sin cierre → hoy aunque haya fecha de entrega comprometida;
 * cerrada → día de entrega declarado.
 */
export function finTramoVencidoGanttMs(
  s: SolicitudParaVencimiento & { status: RequestStatus },
  ahora: Date = new Date(),
): number {
  if (!esSolicitudVencida(s, ahora)) {
    return inicioDiaHoyLaPaz(ahora);
  }
  if (!solicitudEntregadaCerrada(s.status)) {
    return inicioDiaHoyLaPaz(ahora);
  }
  if (s.fechaEntrega) {
    return instanteCalendarioLaPaz(s.fechaEntrega);
  }
  return inicioDiaHoyLaPaz(ahora);
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

export type TonoEstadoPlazoUi = 'neutro' | 'ambar' | 'ok' | 'atraso';

/**
 * Texto del chip «Estado de plazo» en detalle (Spark M5): sin entrega no debe decir solo «A tiempo».
 */
export function descripcionEstadoPlazoUi(
  fechaRequeridaIso: string,
  fechaEntregaIso: string | null,
  ahora: Date = new Date(),
): { texto: string; tono: TonoEstadoPlazoUi } {
  if (!fechaEntregaIso) {
    const dias = diasHastaFechaRequerida(fechaRequeridaIso, ahora);
    if (dias < 0) {
      return {
        texto: `Sin fecha de entrega · la fecha requerida venció hace ${Math.abs(dias)} día(s)`,
        tono: 'ambar',
      };
    }
    if (dias === 0) {
      return {
        texto: 'Sin fecha de entrega · la fecha requerida es hoy',
        tono: 'ambar',
      };
    }
    const tono: TonoEstadoPlazoUi = dias <= 3 ? 'ambar' : 'neutro';
    return {
      texto: `Sin fecha de entrega · faltan ${dias} día(s) para la fecha requerida`,
      tono,
    };
  }

  const estado = evaluarEstadoPlazoDesdeEntrega(fechaRequeridaIso, fechaEntregaIso);
  const diasDiff = diasEntregaVsRequerida(fechaRequeridaIso, fechaEntregaIso);
  if (estado === 'a_tiempo') {
    if (diasDiff === 0) {
      return { texto: 'A tiempo · entrega el mismo día que la fecha requerida', tono: 'ok' };
    }
    return {
      texto: `A tiempo · ${diasDiff} día(s) antes de la fecha requerida`,
      tono: 'ok',
    };
  }
  return {
    texto: `Atraso · ${Math.abs(diasDiff)} día(s) después de la fecha requerida`,
    tono: 'atraso',
  };
}

function evaluarEstadoPlazoDesdeEntrega(
  fechaRequeridaIso: string,
  fechaEntregaIso: string,
): 'a_tiempo' | 'atraso' {
  const diaReq = obtenerDiaCalendarioEnZona(new Date(fechaRequeridaIso));
  const diaEnt = obtenerDiaCalendarioEnZona(new Date(fechaEntregaIso));
  return diaEnt <= diaReq ? 'a_tiempo' : 'atraso';
}

function diasEntregaVsRequerida(fechaRequeridaIso: string, fechaEntregaIso: string): number {
  const diaReq = obtenerDiaCalendarioEnZona(new Date(fechaRequeridaIso));
  const diaEnt = obtenerDiaCalendarioEnZona(new Date(fechaEntregaIso));
  const tReq = new Date(`${diaReq}T12:00:00.000Z`).getTime();
  const tEnt = new Date(`${diaEnt}T12:00:00.000Z`).getTime();
  return Math.round((tReq - tEnt) / 86_400_000);
}