import { RequestPriority, RequestStatus } from '../enums/index.js';
import { obtenerDiaCalendarioEnZona } from './fechas-solicitud.js';
import { diasHastaFechaRequerida } from './vencimiento-solicitud.js';

/**
 * Vista carga del equipo (boceto 04) — umbrales en días naturales.
 * Nota: el dashboard T8 usa `esSolicitudVencida` en vencimiento-solicitud.ts,
 * que también cuenta entregas tardías; aquí solo “sin entrega y fecha requerida pasada”.
 */
export const UMBRAL_POR_VENCER_DIAS_NATURALES = 3;

/** Puntos por prioridad (única fuente de verdad). */
export const PUNTOS_PRIORIDAD_CARGA: Record<RequestPriority, number> = {
  [RequestPriority.BAJA]: 1,
  [RequestPriority.MEDIA]: 2,
  [RequestPriority.ALTA]: 3,
  [RequestPriority.URGENTE]: 4,
};

/** Niveles: baja ≤10, media 11–20, alta ≥21 (suma de puntos en activas). */
export const UMBRALES_NIVEL_CARGA_PUNTOS = {
  bajaHasta: 10,
  mediaHasta: 20,
} as const;

export type NivelCarga = 'baja' | 'media' | 'alta';

export type SolicitudCargaRow = {
  status: RequestStatus;
  priority: RequestPriority;
  fechaRequerida: Date | string | null;
  fechaEntrega: Date | string | null;
  assignedAnalystId: string | null;
  code?: string;
  id?: string;
};

/** Activas: EN_ANALISIS, EN_REVISION_COORDINACION; REGISTRADA solo si tiene encargado. */
export function esActivaParaCarga(s: SolicitudCargaRow): boolean {
  if (
    s.status === RequestStatus.EN_ANALISIS ||
    s.status === RequestStatus.EN_REVISION_COORDINACION
  ) {
    return true;
  }
  if (s.status === RequestStatus.REGISTRADA && s.assignedAnalystId) {
    return true;
  }
  return false;
}

/** Vencida (vista carga): fecha requerida pasada y aún sin fecha de entrega. */
export function esVencidaVistaCarga(s: SolicitudCargaRow, ahora: Date = new Date()): boolean {
  if (!esActivaParaCarga(s) || !s.fechaRequerida || s.fechaEntrega) {
    return false;
  }
  const diaReq = obtenerDiaCalendarioEnZona(new Date(s.fechaRequerida));
  const diaHoy = obtenerDiaCalendarioEnZona(ahora);
  return diaHoy > diaReq;
}

/** Por vencer: sin entrega, no vencida, faltan ≤3 días naturales para fecha requerida. */
export function esPorVencerVistaCarga(s: SolicitudCargaRow, ahora: Date = new Date()): boolean {
  if (!esActivaParaCarga(s) || !s.fechaRequerida || s.fechaEntrega) {
    return false;
  }
  if (esVencidaVistaCarga(s, ahora)) {
    return false;
  }
  const dias = diasHastaFechaRequerida(s.fechaRequerida, ahora);
  return dias >= 0 && dias <= UMBRAL_POR_VENCER_DIAS_NATURALES;
}

export function puntosPrioridadSolicitud(s: SolicitudCargaRow): number {
  if (!esActivaParaCarga(s)) {
    return 0;
  }
  return PUNTOS_PRIORIDAD_CARGA[s.priority] ?? 0;
}

export function nivelCargaPorPuntos(puntos: number): NivelCarga {
  if (puntos >= UMBRALES_NIVEL_CARGA_PUNTOS.mediaHasta + 1) {
    return 'alta';
  }
  if (puntos >= UMBRALES_NIVEL_CARGA_PUNTOS.bajaHasta + 1) {
    return 'media';
  }
  return 'baja';
}

export function contarActivasPorEstadoCarga(
  solicitudes: SolicitudCargaRow[],
): {
  [RequestStatus.REGISTRADA]: number;
  [RequestStatus.EN_ANALISIS]: number;
  [RequestStatus.EN_REVISION_COORDINACION]: number;
} {
  const base = {
    [RequestStatus.REGISTRADA]: 0,
    [RequestStatus.EN_ANALISIS]: 0,
    [RequestStatus.EN_REVISION_COORDINACION]: 0,
  };
  for (const s of solicitudes) {
    if (!esActivaParaCarga(s)) continue;
    if (
      s.status === RequestStatus.REGISTRADA ||
      s.status === RequestStatus.EN_ANALISIS ||
      s.status === RequestStatus.EN_REVISION_COORDINACION
    ) {
      base[s.status] += 1;
    }
  }
  return base;
}

export type ResumenCargaPersona = {
  puntosCarga: number;
  nivel: NivelCarga;
  activas: number;
  porEstado: ReturnType<typeof contarActivasPorEstadoCarga>;
  vencidas: number;
  porVencer: number;
  proximaFechaEntrega: string | null;
  proximaSolicitudCodigo: string | null;
};

export function resumirCargaDesdeSolicitudes(
  solicitudes: SolicitudCargaRow[],
  ahora: Date = new Date(),
): ResumenCargaPersona {
  const activas = solicitudes.filter(esActivaParaCarga);
  const puntos = activas.reduce((acc, s) => acc + puntosPrioridadSolicitud(s), 0);
  const vencidas = activas.filter((s) => esVencidaVistaCarga(s, ahora)).length;
  const porVencer = activas.filter((s) => esPorVencerVistaCarga(s, ahora)).length;

  let proximaFechaEntrega: string | null = null;
  let proximaSolicitudCodigo: string | null = null;
  for (const s of activas) {
    if (!s.fechaEntrega) continue;
    const iso = new Date(s.fechaEntrega).toISOString();
    if (!proximaFechaEntrega || iso < proximaFechaEntrega) {
      proximaFechaEntrega = iso;
      proximaSolicitudCodigo = s.code ?? null;
    }
  }

  return {
    puntosCarga: puntos,
    nivel: nivelCargaPorPuntos(puntos),
    activas: activas.length,
    porEstado: contarActivasPorEstadoCarga(activas),
    vencidas,
    porVencer,
    proximaFechaEntrega,
    proximaSolicitudCodigo,
  };
}