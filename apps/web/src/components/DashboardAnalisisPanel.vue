<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import { apiClient } from '../api/client';
import {
  BNB_COLORS,
  DashboardAnalisisStats,
  RequestStatus,
  STATUS_LABELS,
  formatearFechaCalendarioLaPaz,
} from '@bnb/shared';

type PeriodoPreset = '7d' | '30d' | '90d' | 'custom';

const loading = ref(true);
const errorMessage = ref('');
const analisis = ref<DashboardAnalisisStats | null>(null);

const periodo = ref<PeriodoPreset>('30d');
const filtroArea = ref('');
const fechaDesde = ref('');
const fechaHasta = ref('');

const estadosCargaStack = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
] as const;

const coloresEstadoCarga: Record<(typeof estadosCargaStack)[number], string> = {
  [RequestStatus.REGISTRADA]: '#bae6fd',
  [RequestStatus.EN_ANALISIS]: '#fde68a',
  [RequestStatus.EN_REVISION_COORDINACION]: '#ddd6fe',
};

/** Plugin Chart.js: texto centrado en doughnut (porcentaje a tiempo). */
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart: {
    ctx: CanvasRenderingContext2D;
    chartArea: { top: number; bottom: number; left: number; right: number };
    config: { options?: { plugins?: { centerText?: { text?: string } } } };
  }) {
    const texto = chart.config.options?.plugins?.centerText?.text;
    if (!texto) return;
    const { ctx, chartArea } = chart;
    const { top, bottom, left, right } = chartArea;
    ctx.save();
    ctx.font = 'bold 1.35rem "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, (left + right) / 2, (top + bottom) / 2);
    ctx.restore();
  },
};

const doughnutPlugins = [centerTextPlugin];

const opcionesDoughnutBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    x: { display: false },
    y: { display: false },
  },
};

const ticksEnteros = {
  precision: 0,
};

function unwrapPayload<T>(res: { data?: T } | T): T {
  if (res && typeof res === 'object' && 'data' in (res as object) && (res as { data?: T }).data != null) {
    return (res as { data: T }).data;
  }
  return res as T;
}

async function cargar() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const params: Record<string, string> = { period: periodo.value };
    if (filtroArea.value) params.area = filtroArea.value;
    if (periodo.value === 'custom') {
      if (fechaDesde.value) params.from = fechaDesde.value;
      if (fechaHasta.value) params.to = fechaHasta.value;
    }
    const res = await apiClient.get('/dashboard/analisis', {
      params,
      skipGlobalErrorHandler: true,
    } as any);
    analisis.value = unwrapPayload<DashboardAnalisisStats>(
      res as DashboardAnalisisStats | { data: DashboardAnalisisStats },
    );
  } catch (err: unknown) {
    const e = err as {
      response?: { data?: { error?: { message?: string | string[] }; message?: string } };
      message?: string;
    };
    const apiMsg = e.response?.data?.error?.message;
    const flat =
      typeof apiMsg === 'string'
        ? apiMsg
        : Array.isArray(apiMsg)
          ? apiMsg.join(', ')
          : e.response?.data?.message;
    errorMessage.value = flat || e.message || 'No se pudo cargar el análisis operativo';
  } finally {
    loading.value = false;
  }
}

const omitirRecargaAuto = ref(false);

onMounted(cargar);

watch([periodo, filtroArea, fechaDesde, fechaHasta], () => {
  if (omitirRecargaAuto.value) return;
  if (periodo.value === 'custom' && (!fechaDesde.value || !fechaHasta.value)) return;
  void cargar();
});

defineExpose({ cargar });

function limpiarFiltros() {
  omitirRecargaAuto.value = true;
  periodo.value = '30d';
  filtroArea.value = '';
  fechaDesde.value = '';
  fechaHasta.value = '';
  omitirRecargaAuto.value = false;
  void cargar();
}

function formatoDelta(delta: number | null, unidad = ''): string {
  if (delta === null) return 'Sin comparación de período';
  if (delta === 0) return 'Sin cambio vs período anterior';
  const signo = delta > 0 ? '+' : '';
  return `${signo}${delta}${unidad} vs período anterior`;
}

function formatoValorKpi(clave: keyof DashboardAnalisisStats['resumen'], valor: number): string {
  if (clave === 'entregadasATiempoPct') return `${Math.round(valor)}%`;
  if (clave === 'tiempoPromedioRespuestaDias') return valor.toFixed(1);
  return String(valor);
}

const areasOpciones = computed(() => {
  const base = analisis.value?.areasDisponibles ?? [];
  if (filtroArea.value && !base.includes(filtroArea.value)) {
    return [...base, filtroArea.value].sort();
  }
  return base;
});

const subtituloPeriodo = computed(() => {
  const p = analisis.value?.periodo;
  if (!p) return 'Indicadores de plazo, carga y tendencias del período seleccionado.';
  const desde = formatearFechaCalendarioLaPaz(p.desde);
  const hasta = formatearFechaCalendarioLaPaz(p.hasta);
  return `Del ${desde} al ${hasta} · comparación con el período anterior equivalente.`;
});

const chartEstados = computed(() => {
  if (!analisis.value?.porEstado) return null;
  const labels: string[] = [];
  const data: number[] = [];
  (Object.keys(analisis.value.porEstado) as RequestStatus[]).forEach((st) => {
    const n = analisis.value!.porEstado[st];
    if (n > 0) {
      labels.push(STATUS_LABELS[st]);
      data.push(n);
    }
  });
  if (!data.length) return null;
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [
          BNB_COLORS.info,
          BNB_COLORS.warning,
          BNB_COLORS.secondary,
          BNB_COLORS.primary,
          BNB_COLORS.danger,
          '#94a3b8',
        ],
      },
    ],
  };
});

const chartAreas = computed(() => {
  const filas = analisis.value?.porAreaRequester ?? [];
  if (!filas.length) return null;
  return {
    labels: filas.map((f) => f.area),
    datasets: [
      {
        label: 'Solicitudes',
        data: filas.map((f) => f.count),
        backgroundColor: BNB_COLORS.primary,
        borderRadius: 6,
      },
    ],
  };
});

const porcentajeEntregaCentro = computed(() => {
  const ep = analisis.value?.entregaPlazo;
  if (!ep) return '';
  const total = ep.aTiempo + ep.conAtraso;
  if (!total) return '—';
  return `${Math.round((ep.aTiempo / total) * 100)}%`;
});

const chartEntregaPlazo = computed(() => {
  const ep = analisis.value?.entregaPlazo;
  if (!ep) return null;
  const segmentos = [
    { label: 'A tiempo', valor: ep.aTiempo, color: BNB_COLORS.primary },
    { label: 'Fuera de plazo', valor: ep.conAtraso, color: BNB_COLORS.danger },
  ].filter((s) => s.valor > 0);
  if (!segmentos.length) return null;
  return {
    labels: segmentos.map((s) => s.label),
    datasets: [
      {
        data: segmentos.map((s) => s.valor),
        backgroundColor: segmentos.map((s) => s.color),
      },
    ],
  };
});

const chartTiempoRespuesta = computed(() => {
  const serie = analisis.value?.tiempoRespuestaPorMes ?? [];
  if (!serie.length) return null;
  return {
    labels: serie.map((s) => s.mes),
    datasets: [
      {
        label: 'Días promedio',
        data: serie.map((s) => s.promedioDias ?? 0),
        borderColor: BNB_COLORS.info,
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
});

const chartCargaAnalista = computed(() => {
  const filas = analisis.value?.cargaPorAnalista ?? [];
  if (!filas.length) return null;
  const labels = filas.map((f) => f.analistaNombre);
  const datasets = estadosCargaStack.map((st) => ({
    label: STATUS_LABELS[st],
    data: filas.map((f) => f.porEstado[st] ?? 0),
    backgroundColor: coloresEstadoCarga[st],
    stack: 'carga',
  }));
  datasets.push({
    label: 'Vencidas',
    data: filas.map((f) => f.vencidas),
    backgroundColor: BNB_COLORS.danger,
    stack: 'carga',
  });
  return { labels, datasets };
});

const chartSerieMensual = computed(() => {
  const serie = analisis.value?.serieMensual ?? [];
  if (!serie.length) return null;
  return {
    labels: serie.map((s) => s.mes),
    datasets: [
      {
        label: 'Creadas',
        data: serie.map((s) => s.creadas),
        borderColor: BNB_COLORS.info,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.25,
      },
      {
        label: 'Cerradas',
        data: serie.map((s) => s.cerradas),
        borderColor: BNB_COLORS.primary,
        backgroundColor: 'rgba(38, 180, 96, 0.1)',
        fill: false,
        tension: 0.25,
      },
      {
        label: 'Vencidas',
        data: serie.map((s) => s.vencidas),
        borderColor: BNB_COLORS.danger,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        fill: false,
        tension: 0.25,
      },
    ],
  };
});

const opcionesAreas = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { x: number } }) => {
          const n = ctx.parsed.x;
          return `${n} ${n === 1 ? 'solicitud' : 'solicitudes'}`;
        },
      },
    },
  },
  scales: {
    x: { ticks: ticksEnteros },
    y: { ticks: { autoSkip: false } },
  },
  onClick: (_evt: unknown, elements: Array<{ index: number }>, chart: { data: { labels?: string[] } }) => {
    if (!elements?.length) return;
    const area = chart.data.labels?.[elements[0]!.index];
    if (area) {
      filtroArea.value = area;
    }
  },
}));

const opcionesEntregaPlazo = computed(() => ({
  ...opcionesDoughnutBase,
  plugins: {
    ...opcionesDoughnutBase.plugins,
    centerText: { text: porcentajeEntregaCentro.value },
  },
}));

const opcionesBarrasApiladas = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { x: number } }) => {
          const n = ctx.parsed.x;
          if (!n) return '';
          return `${ctx.dataset.label}: ${n} ${n === 1 ? 'solicitud' : 'solicitudes'}`;
        },
      },
    },
  },
  scales: {
    x: { stacked: true, ticks: ticksEnteros },
    y: { stacked: true, ticks: { autoSkip: false } },
  },
};

const opcionesLinea = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    x: { ticks: ticksEnteros },
    y: { ticks: ticksEnteros, title: { display: true, text: 'Días' } },
  },
};

const opcionesSerieMensual = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    x: { ticks: ticksEnteros },
    y: { ticks: ticksEnteros, beginAtZero: true },
  },
};

const tarjetasKpi = computed(() => {
  const r = analisis.value?.resumen;
  if (!r) return [];
  return [
    {
      key: 'solicitudesPeriodo' as const,
      label: 'Solicitudes del período',
      clase: '',
    },
    {
      key: 'tiempoPromedioRespuestaDias' as const,
      label: 'Tiempo promedio respuesta (días)',
      clase: 'kpi-info',
    },
    {
      key: 'entregadasATiempoPct' as const,
      label: 'Entregadas a tiempo',
      clase: 'kpi-ok',
      sufijoDelta: ' pts',
    },
    {
      key: 'vencidas' as const,
      label: 'Vencidas',
      clase: 'kpi-danger',
    },
    {
      key: 'aprobacionesPendientes' as const,
      label: 'Aprobaciones pendientes',
      clase: 'kpi-warn',
    },
  ].map((meta) => {
    const kpi = r[meta.key];
    const unidadDelta =
      meta.key === 'entregadasATiempoPct' ? ' pts' : meta.key === 'tiempoPromedioRespuestaDias' ? ' d' : '';
    return {
      ...meta,
      valor: formatoValorKpi(meta.key, kpi.valor),
      delta: formatoDelta(kpi.deltaVsPeriodoAnterior, meta.sufijoDelta ?? unidadDelta),
      deltaPositivo: (kpi.deltaVsPeriodoAnterior ?? 0) > 0,
      deltaNegativo: (kpi.deltaVsPeriodoAnterior ?? 0) < 0,
    };
  });
});
</script>

<template>
  <section class="analisis-panel">
    <div class="analisis-header">
      <div>
        <h2 class="analisis-title">Análisis operativo</h2>
        <p class="analisis-sub">{{ subtituloPeriodo }}</p>
      </div>
      <button type="button" class="refresh-mini" :disabled="loading" @click="cargar">
        <font-awesome-icon icon="rotate" :spin="loading" />
        Actualizar
      </button>
    </div>

    <div class="filtros-bar">
      <label class="filtro-field">
        <span>Período</span>
        <select v-model="periodo" class="filtro-select">
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="custom">Personalizado</option>
        </select>
      </label>

      <template v-if="periodo === 'custom'">
        <label class="filtro-field">
          <span>Desde</span>
          <input v-model="fechaDesde" class="filtro-input" type="date" />
        </label>
        <label class="filtro-field">
          <span>Hasta</span>
          <input v-model="fechaHasta" class="filtro-input" type="date" />
        </label>
      </template>

      <label class="filtro-field">
        <span>Área solicitante</span>
        <select v-model="filtroArea" class="filtro-select">
          <option value="">Todas</option>
          <option v-for="a in areasOpciones" :key="a" :value="a">{{ a }}</option>
        </select>
      </label>

      <button type="button" class="btn-limpiar" @click="limpiarFiltros">Limpiar filtros</button>
    </div>

    <div v-if="loading && !analisis" class="analisis-loading">
      <font-awesome-icon icon="spinner" spin />
      Cargando análisis…
    </div>

    <div v-else-if="errorMessage" class="analisis-error">{{ errorMessage }}</div>

    <template v-else-if="analisis">
      <div class="kpi-grid">
        <div
          v-for="kpi in tarjetasKpi"
          :key="kpi.key"
          class="kpi-card"
          :class="kpi.clase"
        >
          <span class="kpi-label">{{ kpi.label }}</span>
          <span class="kpi-value">{{ kpi.valor }}</span>
          <span
            class="kpi-delta"
            :class="{ 'delta-up': kpi.deltaPositivo, 'delta-down': kpi.deltaNegativo }"
          >
            {{ kpi.delta }}
          </span>
        </div>
      </div>

      <div class="charts-grid">
        <div v-if="chartEstados" class="chart-card">
          <h3>Distribución por estado</h3>
          <div class="chart-box">
            <Chart type="doughnut" :data="chartEstados" :options="opcionesDoughnutBase" />
          </div>
        </div>

        <div v-if="chartAreas" class="chart-card">
          <h3>Solicitudes por área solicitante</h3>
          <p class="chart-hint">Haga clic en una barra para filtrar por área.</p>
          <div class="chart-box">
            <Chart type="bar" :data="chartAreas" :options="opcionesAreas" />
          </div>
        </div>

        <div v-if="chartEntregaPlazo" class="chart-card">
          <h3>Entrega dentro del plazo</h3>
          <div class="chart-box">
            <Chart
              type="doughnut"
              :data="chartEntregaPlazo"
              :options="opcionesEntregaPlazo"
              :plugins="doughnutPlugins"
            />
          </div>
        </div>

        <div v-if="chartTiempoRespuesta" class="chart-card">
          <h3>Tiempo de respuesta (tendencia mensual)</h3>
          <div class="chart-box chart-box-tall">
            <Chart type="line" :data="chartTiempoRespuesta" :options="opcionesLinea" />
          </div>
        </div>

        <div v-if="chartCargaAnalista" class="chart-card chart-wide">
          <h3>Carga por analista</h3>
          <div class="chart-box chart-box-carga">
            <Chart type="bar" :data="chartCargaAnalista" :options="opcionesBarrasApiladas" />
          </div>
        </div>

        <div v-if="chartSerieMensual" class="chart-card chart-wide">
          <h3>Serie mensual: creadas, cerradas y vencidas</h3>
          <div class="chart-box chart-box-tall">
            <Chart type="line" :data="chartSerieMensual" :options="opcionesSerieMensual" />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.analisis-panel {
  margin-bottom: 2rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem 1.5rem 1.5rem;
}

.analisis-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.analisis-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
}

.analisis-sub {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.refresh-mini {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.filtros-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: flex-end;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.filtro-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #64748b;
}

.filtro-select,
.filtro-input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
  font-size: 0.88rem;
  min-width: 9.5rem;
  background: #fff;
}

.btn-limpiar {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: #334155;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.kpi-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
}

.kpi-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.kpi-value {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
}

.kpi-delta {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  color: #64748b;
}

.kpi-delta.delta-up {
  color: #15803d;
}

.kpi-delta.delta-down {
  color: #b91c1c;
}

.kpi-warn .kpi-value {
  color: #b45309;
}

.kpi-info .kpi-value {
  color: #2563eb;
}

.kpi-ok .kpi-value {
  color: var(--bnb-green);
}

.kpi-danger .kpi-value {
  color: #dc2626;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.chart-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.85rem 1rem 1rem;
}

.chart-card h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: #334155;
}

.chart-hint {
  margin: -0.25rem 0 0.35rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-box {
  height: 220px;
}

.chart-box-tall {
  height: 260px;
}

.chart-box-carga {
  height: min(420px, 56px * 8);
}

.analisis-loading,
.analisis-error {
  color: #64748b;
  font-size: 0.9rem;
}

.analisis-error {
  color: #b91c1c;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>