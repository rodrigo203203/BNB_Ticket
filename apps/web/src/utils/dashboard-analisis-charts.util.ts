import { DashboardAnalisisStats, RequestStatus } from '@bnb/shared';

/** Comprueba que el payload de análisis puede alimentar los gráficos del panel (no datasets vacíos con datos). */
export function analisisTieneFuentesDeGraficos(stats: DashboardAnalisisStats): {
  ok: boolean;
  motivos: string[];
} {
  const motivos: string[] = [];

  const totalEstado = Object.values(stats.porEstado ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  if (totalEstado <= 0) motivos.push('porEstado vacío');

  const areas = stats.porAreaRequester ?? [];
  const sumAreas = areas.reduce((a, r) => a + r.count, 0);
  if (!areas.length || sumAreas <= 0) motivos.push('porAreaRequester vacío');

  const carga = stats.cargaPorAnalista ?? [];
  const sumCarga = carga.reduce(
    (a, row) =>
      a +
      (row.porEstado[RequestStatus.REGISTRADA] ?? 0) +
      (row.porEstado[RequestStatus.EN_ANALISIS] ?? 0) +
      (row.porEstado[RequestStatus.EN_REVISION_COORDINACION] ?? 0) +
      row.vencidas,
    0,
  );
  if (!carga.length || sumCarga <= 0) motivos.push('cargaPorAnalista vacío');

  const serie = stats.serieMensual ?? [];
  const sumSerie = serie.reduce((a, m) => a + m.creadas + m.cerradas + m.vencidas, 0);
  if (!serie.length || sumSerie <= 0) motivos.push('serieMensual vacía');

  const tiempo = stats.tiempoRespuestaPorMes ?? [];
  if (!tiempo.length) motivos.push('tiempoRespuestaPorMes vacío');

  return { ok: motivos.length === 0, motivos };
}