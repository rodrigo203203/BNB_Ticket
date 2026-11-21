import { RequestStatus } from '../enums/index.js';
import { esSolicitudVencida, esSolicitudPorVencer, SolicitudParaVencimiento } from './vencimiento-solicitud.js';

/** Umbral "por vencer" en días naturales (documentado para T9b; no hábiles). */
export const UMBRAL_POR_VENCER_DIAS_NATURALES = 3;

/** Estados que cuentan como solicitud activa en carga de equipo. */
export const ESTADOS_ACTIVOS_CARGA: RequestStatus[] = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
];

export type NivelCarga = 'baja' | 'media' | 'alta';

/**
 * Pesos para indicador de carga (activas + énfasis en vencidas).
 * Documentado: baja <=6, media <=12, alta >12 (score).
 */
export const UMBRALES_INDICADOR_CARGA = {
  /** activas + vencidas*2 */
  puntajeAlto: 12,
  puntajeMedio: 6,
} as const;

export function calcularPuntajeCarga(activas: number, vencidas: number): number {
  return activas + vencidas * 2;
}

export function nivelCargaDesdePuntaje(puntaje: number): NivelCarga {
  if (puntaje > UMBRALES_INDICADOR_CARGA.puntajeAlto) return 'alta';
  if (puntaje > UMBRALES_INDICADOR_CARGA.puntajeMedio) return 'media';
  return 'baja';
}

export function contarActivasPorEstado(
  solicitudes: Array<{ status: RequestStatus }>,
): Record<RequestStatus, number> {
  const base = {
    [RequestStatus.REGISTRADA]: 0,
    [RequestStatus.EN_ANALISIS]: 0,
    [RequestStatus.EN_REVISION_COORDINACION]: 0,
    [RequestStatus.APROBADA]: 0,
    [RequestStatus.RECHAZADA]: 0,
    [RequestStatus.CANCELADA]: 0,
  };
  for (const s of solicitudes) {
    if (ESTADOS_ACTIVOS_CARGA.includes(s.status)) {
      base[s.status] += 1;
    }
  }
  return base;
}

export function resumirCargaUsuario(
  solicitudes: SolicitudParaVencimiento[],
  ahora: Date = new Date(),
) {
  const activas = solicitudes.filter((s) => ESTADOS_ACTIVOS_CARGA.includes(s.status));
  const vencidas = activas.filter((s) => esSolicitudVencida(s, ahora)).length;
  const porVencer = activas.filter((s) =>
    esSolicitudPorVencer(s, UMBRAL_POR_VENCER_DIAS_NATURALES, ahora),
  ).length;

  let proximaEntrega: string | null = null;
  for (const s of activas) {
    if (!s.fechaEntrega) continue;
    const iso = new Date(s.fechaEntrega).toISOString();
    if (!proximaEntrega || iso < proximaEntrega) proximaEntrega = iso;
  }

  const puntaje = calcularPuntajeCarga(activas.length, vencidas);
  return {
    activas: activas.length,
    porEstado: contarActivasPorEstado(activas),
    vencidas,
    porVencer,
    proximaFechaEntrega: proximaEntrega,
    puntajeCarga: puntaje,
    indicador: nivelCargaDesdePuntaje(puntaje),
  };
}