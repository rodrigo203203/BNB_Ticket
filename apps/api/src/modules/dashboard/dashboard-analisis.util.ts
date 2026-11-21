import {
  DashboardAnalisisStats,
  RequestCategory,
  RequestStatus,
  UMBRAL_POR_VENCER_DIAS_NATURALES,
  esSolicitudPorVencer,
  esSolicitudVencida,
  obtenerMesCalendarioEnZona,
} from '@bnb/shared';

export type SolicitudAnalisisRow = {
  status: RequestStatus;
  category: RequestCategory;
  fechaRequerida: Date | null;
  fechaEntrega: Date | null;
  closedAt: Date | null;
};

/** Agrega métricas de análisis operativo (boceto 02) sobre el subconjunto visible al rol. */
export function computarAnalisisDesdeSolicitudes(
  rows: SolicitudAnalisisRow[],
  ahora: Date = new Date(),
): DashboardAnalisisStats {
  const mesActual = obtenerMesCalendarioEnZona(ahora);

  const porEstado: Record<RequestStatus, number> = {
    [RequestStatus.REGISTRADA]: 0,
    [RequestStatus.EN_ANALISIS]: 0,
    [RequestStatus.EN_REVISION_COORDINACION]: 0,
    [RequestStatus.APROBADA]: 0,
    [RequestStatus.RECHAZADA]: 0,
    [RequestStatus.CANCELADA]: 0,
  };

  const porCategoria: Record<RequestCategory, number> = {
    [RequestCategory.EXTRACCION_DATOS]: 0,
    [RequestCategory.REPORTES_BI]: 0,
    [RequestCategory.MODELOS_ML]: 0,
    [RequestCategory.CALIDAD_DATOS]: 0,
    [RequestCategory.GOBIERNO_DATOS]: 0,
    [RequestCategory.ACCESO_BD]: 0,
  };

  let activas = 0;
  let vencidas = 0;
  let porVencer = 0;
  let completadasMes = 0;
  let rechazadas = 0;
  let canceladas = 0;

  const mesesMap = new Map<string, { completadas: number; rechazadas: number; canceladas: number }>();

  const estadosActivos = [
    RequestStatus.REGISTRADA,
    RequestStatus.EN_ANALISIS,
    RequestStatus.EN_REVISION_COORDINACION,
  ];

  for (const s of rows) {
    porEstado[s.status] += 1;
    porCategoria[s.category] += 1;

    if (estadosActivos.includes(s.status)) {
      activas += 1;
      const paraVenc = {
        status: s.status,
        fechaRequerida: s.fechaRequerida,
        fechaEntrega: s.fechaEntrega,
      };
      if (esSolicitudVencida(paraVenc, ahora)) vencidas += 1;
      if (esSolicitudPorVencer(paraVenc, UMBRAL_POR_VENCER_DIAS_NATURALES, ahora)) porVencer += 1;
    }

    if (s.status === RequestStatus.RECHAZADA) rechazadas += 1;
    if (s.status === RequestStatus.CANCELADA) canceladas += 1;

    if (s.status === RequestStatus.APROBADA && s.closedAt) {
      const mesCierre = obtenerMesCalendarioEnZona(s.closedAt);
      if (mesCierre === mesActual) completadasMes += 1;
      if (!mesesMap.has(mesCierre)) {
        mesesMap.set(mesCierre, { completadas: 0, rechazadas: 0, canceladas: 0 });
      }
      mesesMap.get(mesCierre)!.completadas += 1;
    }

    if (s.status === RequestStatus.RECHAZADA && s.closedAt) {
      const mesCierre = obtenerMesCalendarioEnZona(s.closedAt);
      if (!mesesMap.has(mesCierre)) {
        mesesMap.set(mesCierre, { completadas: 0, rechazadas: 0, canceladas: 0 });
      }
      mesesMap.get(mesCierre)!.rechazadas += 1;
    }

    if (s.status === RequestStatus.CANCELADA && s.closedAt) {
      const mesCierre = obtenerMesCalendarioEnZona(s.closedAt);
      if (!mesesMap.has(mesCierre)) {
        mesesMap.set(mesCierre, { completadas: 0, rechazadas: 0, canceladas: 0 });
      }
      mesesMap.get(mesCierre)!.canceladas += 1;
    }
  }

  const serieUltimosMeses = Array.from(mesesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mes, v]) => ({ mes, ...v }));

  return {
    resumen: {
      activas,
      vencidas,
      porVencer,
      completadasMes,
      rechazadas,
      canceladas,
    },
    porEstado,
    porCategoria,
    serieUltimosMeses,
  };
}