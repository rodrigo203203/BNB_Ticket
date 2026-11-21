import {
  DashboardAnalisisCargaAnalistaRow,
  DashboardAnalisisKpi,
  DashboardAnalisisStats,
  RequestCategory,
  RequestStatus,
  esSolicitudVencida,
  obtenerDiaCalendarioEnZona,
  obtenerMesCalendarioEnZona,
  desplazarDiaCalendarioLaPaz,
  inicioDiaHoyLaPaz,
} from '@bnb/shared';
import { DashboardAnalisisQueryDto } from './dto/dashboard-analisis-query.dto';

const MS_DIA = 86_400_000;

export type SolicitudAnalisisRow = {
  status: RequestStatus;
  category: RequestCategory;
  fechaRequerida: Date | null;
  fechaEntrega: Date | null;
  closedAt: Date | null;
  requesterArea: string;
  createdAt: Date;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;
};

export type VentanaAnalisis = {
  desde: Date;
  hasta: Date;
  desdeAnterior: Date | null;
  hastaAnterior: Date | null;
  clave: '7d' | '30d' | '90d' | 'custom';
};

const ACTIVOS = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
];

/** Fin del día calendario actual en America/La_Paz (N2). */
function finDiaHoyLaPaz(ahora: Date): Date {
  return new Date(inicioDiaHoyLaPaz(ahora) + MS_DIA - 1);
}

function inicioDiaLaPaz(isoDia: string): Date {
  return new Date(`${isoDia}T12:00:00.000Z`);
}

function enRango(ts: Date, desde: Date, hasta: Date): boolean {
  return ts.getTime() >= desde.getTime() && ts.getTime() <= hasta.getTime();
}

function kpi(valor: number, anterior: number | null): DashboardAnalisisKpi {
  return {
    valor,
    deltaVsPeriodoAnterior: anterior === null ? null : valor - anterior,
  };
}

/** Resuelve ventana actual y anterior según preset (Spark B2). */
export function resolverVentanaAnalisis(
  query: DashboardAnalisisQueryDto,
  ahora = new Date(),
): VentanaAnalisis {
  const clave = query.period ?? '30d';
  const hasta = finDiaHoyLaPaz(ahora);

  if (clave === 'custom' && query.from && query.to) {
    const desde = inicioDiaLaPaz(obtenerDiaCalendarioEnZona(new Date(query.from)));
    const hastaCustom = finDiaHoyLaPaz(new Date(query.to));
    const duracion = hastaCustom.getTime() - desde.getTime() + MS_DIA;
    const hastaAnterior = new Date(desde.getTime() - MS_DIA);
    const desdeAnterior = new Date(hastaAnterior.getTime() - duracion + MS_DIA);
    return {
      desde,
      hasta: hastaCustom,
      desdeAnterior,
      hastaAnterior: new Date(inicioDiaHoyLaPaz(hastaAnterior) + MS_DIA - 1),
      clave: 'custom',
    };
  }

  const dias = clave === '7d' ? 7 : clave === '90d' ? 90 : 30;
  const diaHoy = obtenerDiaCalendarioEnZona(ahora);
  const diaDesde = desplazarDiaCalendarioLaPaz(diaHoy, -(dias - 1));
  const desde = inicioDiaLaPaz(diaDesde);
  const diaFinAnt = desplazarDiaCalendarioLaPaz(diaDesde, -1);
  const diaDesdeAnt = desplazarDiaCalendarioLaPaz(diaFinAnt, -(dias - 1));
  const hastaAnterior = new Date(inicioDiaLaPaz(diaFinAnt).getTime() + MS_DIA - 1);
  const desdeAnterior = inicioDiaLaPaz(diaDesdeAnt);

  return {
    desde,
    hasta,
    desdeAnterior,
    hastaAnterior,
    clave: clave === 'custom' ? '30d' : clave,
  };
}

type MetricasNucleo = {
  solicitudesPeriodo: number;
  tiempoPromedioRespuestaDias: number;
  entregadasATiempoPct: number;
  vencidas: number;
  aprobacionesPendientes: number;
};

function metricasEnVentana(
  rows: SolicitudAnalisisRow[],
  ventana: { desde: Date; hasta: Date },
  ahora: Date,
): MetricasNucleo {
  const creadas = rows.filter((r) => enRango(r.createdAt, ventana.desde, ventana.hasta));

  const cierres = rows.filter(
    (r) =>
      r.closedAt &&
      enRango(r.closedAt, ventana.desde, ventana.hasta) &&
      (r.status === RequestStatus.APROBADA ||
        r.status === RequestStatus.RECHAZADA ||
        r.status === RequestStatus.CANCELADA),
  );

  let sumaDias = 0;
  let nTiempos = 0;
  let aTiempo = 0;
  let conFecha = 0;

  for (const s of cierres) {
    const fin =
      s.fechaEntrega && s.fechaEntrega.getTime() >= s.createdAt.getTime()
        ? s.fechaEntrega
        : s.closedAt!;
    const dias = (fin.getTime() - s.createdAt.getTime()) / MS_DIA;
    if (dias >= 0) {
      sumaDias += dias;
      nTiempos += 1;
    }
    if (s.fechaRequerida) {
      conFecha += 1;
      const entrega = s.fechaEntrega ?? s.closedAt!;
      if (entrega.getTime() <= s.fechaRequerida.getTime()) aTiempo += 1;
    }
  }

  const activasVencidas = rows.filter((r) => {
    if (!ACTIVOS.includes(r.status)) return false;
    return esSolicitudVencida(
      {
        status: r.status,
        fechaRequerida: r.fechaRequerida,
        fechaEntrega: r.fechaEntrega,
      },
      ahora,
    );
  }).length;

  const aprobacionesPendientes = rows.filter((r) => r.status === RequestStatus.EN_REVISION_COORDINACION).length;

  return {
    solicitudesPeriodo: creadas.length,
    tiempoPromedioRespuestaDias: nTiempos ? sumaDias / nTiempos : 0,
    entregadasATiempoPct: conFecha ? Math.round((aTiempo / conFecha) * 100) : 0,
    vencidas: activasVencidas,
    aprobacionesPendientes,
  };
}

/** Agrega métricas del boceto 02 (Spark B1). */
export function computarAnalisisDesdeSolicitudes(
  rows: SolicitudAnalisisRow[],
  ventana: VentanaAnalisis,
  ahora: Date = new Date(),
): Omit<DashboardAnalisisStats, 'areasDisponibles'> {
  const actual = metricasEnVentana(rows, ventana, ahora);
  const anterior =
    ventana.desdeAnterior && ventana.hastaAnterior
      ? metricasEnVentana(rows, { desde: ventana.desdeAnterior, hasta: ventana.hastaAnterior }, ahora)
      : null;

  const porEstado: Record<RequestStatus, number> = {
    [RequestStatus.REGISTRADA]: 0,
    [RequestStatus.EN_ANALISIS]: 0,
    [RequestStatus.EN_REVISION_COORDINACION]: 0,
    [RequestStatus.APROBADA]: 0,
    [RequestStatus.RECHAZADA]: 0,
    [RequestStatus.CANCELADA]: 0,
  };

  const areaMap = new Map<string, number>();
  const entregaPlazo = { aTiempo: 0, conAtraso: 0 };
  const mesesResp = new Map<string, { sum: number; n: number }>();
  const mesesSerie = new Map<string, { creadas: number; cerradas: number; vencidas: number }>();
  const cargaMap = new Map<string, DashboardAnalisisCargaAnalistaRow>();

  for (const s of rows) {
    if (enRango(s.createdAt, ventana.desde, ventana.hasta)) {
      porEstado[s.status] += 1;
      areaMap.set(s.requesterArea, (areaMap.get(s.requesterArea) ?? 0) + 1);
    }

    if (
      s.closedAt &&
      enRango(s.closedAt, ventana.desde, ventana.hasta) &&
      s.fechaRequerida
    ) {
      const entrega = s.fechaEntrega ?? s.closedAt;
      if (entrega.getTime() <= s.fechaRequerida.getTime()) entregaPlazo.aTiempo += 1;
      else entregaPlazo.conAtraso += 1;
    }

    if (s.closedAt && enRango(s.closedAt, ventana.desde, ventana.hasta)) {
      const mes = obtenerMesCalendarioEnZona(s.closedAt);
      const fin = s.fechaEntrega ?? s.closedAt;
      const dias = (fin.getTime() - s.createdAt.getTime()) / MS_DIA;
      if (dias >= 0) {
        const prev = mesesResp.get(mes) ?? { sum: 0, n: 0 };
        prev.sum += dias;
        prev.n += 1;
        mesesResp.set(mes, prev);
      }
    }

    const mesC = obtenerMesCalendarioEnZona(s.createdAt);
    if (!mesesSerie.has(mesC)) {
      mesesSerie.set(mesC, { creadas: 0, cerradas: 0, vencidas: 0 });
    }
    if (enRango(s.createdAt, ventana.desde, ventana.hasta)) {
      mesesSerie.get(mesC)!.creadas += 1;
    }
    if (s.closedAt && enRango(s.closedAt, ventana.desde, ventana.hasta)) {
      const mesZ = obtenerMesCalendarioEnZona(s.closedAt);
      if (!mesesSerie.has(mesZ)) {
        mesesSerie.set(mesZ, { creadas: 0, cerradas: 0, vencidas: 0 });
      }
      mesesSerie.get(mesZ)!.cerradas += 1;
    }
    if (
      ACTIVOS.includes(s.status) &&
      esSolicitudVencida(
        { status: s.status, fechaRequerida: s.fechaRequerida, fechaEntrega: s.fechaEntrega },
        ahora,
      )
    ) {
      const mesV = obtenerMesCalendarioEnZona(ahora);
      if (!mesesSerie.has(mesV)) {
        mesesSerie.set(mesV, { creadas: 0, cerradas: 0, vencidas: 0 });
      }
      mesesSerie.get(mesV)!.vencidas += 1;
    }

    if (ACTIVOS.includes(s.status)) {
      const key = s.assignedAnalystId ?? '__sin__';
      const nombre = s.assignedAnalystName?.trim() || 'Sin asignar';
      if (!cargaMap.has(key)) {
        cargaMap.set(key, {
          analistaId: s.assignedAnalystId,
          analistaNombre: nombre,
          porEstado: {
            [RequestStatus.REGISTRADA]: 0,
            [RequestStatus.EN_ANALISIS]: 0,
            [RequestStatus.EN_REVISION_COORDINACION]: 0,
            [RequestStatus.APROBADA]: 0,
            [RequestStatus.RECHAZADA]: 0,
            [RequestStatus.CANCELADA]: 0,
          },
          vencidas: 0,
        });
      }
      const row = cargaMap.get(key)!;
      row.porEstado[s.status] += 1;
      if (
        esSolicitudVencida(
          { status: s.status, fechaRequerida: s.fechaRequerida, fechaEntrega: s.fechaEntrega },
          ahora,
        )
      ) {
        row.vencidas += 1;
      }
    }
  }

  const porAreaRequester = Array.from(areaMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  const tiempoRespuestaPorMes = Array.from(mesesResp.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mes, v]) => ({
      mes,
      promedioDias: v.n ? Math.round((v.sum / v.n) * 10) / 10 : null,
    }));

  const serieMensual = Array.from(mesesSerie.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mes, v]) => ({ mes, ...v }));

  const cargaPorAnalista = Array.from(cargaMap.values()).sort((a, b) => {
    const ta =
      a.porEstado[RequestStatus.REGISTRADA] +
      a.porEstado[RequestStatus.EN_ANALISIS] +
      a.porEstado[RequestStatus.EN_REVISION_COORDINACION];
    const tb =
      b.porEstado[RequestStatus.REGISTRADA] +
      b.porEstado[RequestStatus.EN_ANALISIS] +
      b.porEstado[RequestStatus.EN_REVISION_COORDINACION];
    return tb - ta;
  });

  return {
    resumen: {
      solicitudesPeriodo: kpi(
        actual.solicitudesPeriodo,
        anterior ? anterior.solicitudesPeriodo : null,
      ),
      tiempoPromedioRespuestaDias: kpi(
        Math.round(actual.tiempoPromedioRespuestaDias * 10) / 10,
        anterior ? Math.round(anterior.tiempoPromedioRespuestaDias * 10) / 10 : null,
      ),
      entregadasATiempoPct: kpi(
        actual.entregadasATiempoPct,
        anterior ? anterior.entregadasATiempoPct : null,
      ),
      vencidas: kpi(actual.vencidas, anterior ? anterior.vencidas : null),
      aprobacionesPendientes: kpi(
        actual.aprobacionesPendientes,
        anterior ? anterior.aprobacionesPendientes : null,
      ),
    },
    porEstado,
    porAreaRequester,
    entregaPlazo,
    tiempoRespuestaPorMes,
    cargaPorAnalista,
    serieMensual,
    periodo: {
      desde: ventana.desde.toISOString(),
      hasta: ventana.hasta.toISOString(),
      clave: ventana.clave,
    },
  };
}