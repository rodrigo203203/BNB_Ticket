<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Chart from 'primevue/chart';
import { apiClient } from '../api/client';
import {
  CATEGORY_LABELS,
  DashboardAnalisisStats,
  RequestCategory,
  STATUS_LABELS,
  RequestStatus,
  BNB_COLORS,
} from '@bnb/shared';

const loading = ref(true);
const errorMessage = ref('');
const analisis = ref<DashboardAnalisisStats | null>(null);

async function cargar() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiClient.get<any, any>('/dashboard/analisis');
    analisis.value = res.data || res;
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'No se pudo cargar el análisis operativo';
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);

defineExpose({ cargar });

const chartEstados = computed(() => {
  if (!analisis.value) return null;
  const labels: string[] = [];
  const data: number[] = [];
  (Object.keys(analisis.value.porEstado) as RequestStatus[]).forEach((st) => {
    const n = analisis.value!.porEstado[st];
    if (n > 0) {
      labels.push(STATUS_LABELS[st]);
      data.push(n);
    }
  });
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

const chartCategorias = computed(() => {
  if (!analisis.value) return null;
  const labels: string[] = [];
  const data: number[] = [];
  (Object.keys(analisis.value.porCategoria) as RequestCategory[]).forEach((cat) => {
    const n = analisis.value!.porCategoria[cat];
    if (n > 0) {
      labels.push(CATEGORY_LABELS[cat]);
      data.push(n);
    }
  });
  return {
    labels,
    datasets: [
      {
        label: 'Solicitudes',
        data,
        backgroundColor: BNB_COLORS.primary,
        borderRadius: 6,
      },
    ],
  };
});

const chartSerie = computed(() => {
  if (!analisis.value?.serieUltimosMeses.length) return null;
  const serie = analisis.value.serieUltimosMeses;
  return {
    labels: serie.map((s) => s.mes),
    datasets: [
      {
        label: 'Completadas',
        data: serie.map((s) => s.completadas),
        borderColor: BNB_COLORS.primary,
        backgroundColor: 'rgba(38, 180, 96, 0.15)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Rechazadas',
        data: serie.map((s) => s.rechazadas),
        borderColor: BNB_COLORS.danger,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Canceladas',
        data: serie.map((s) => s.canceladas),
        borderColor: '#64748b',
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
};
</script>

<template>
  <section class="analisis-panel">
    <div class="analisis-header">
      <div>
        <h2 class="analisis-title">Análisis operativo</h2>
        <p class="analisis-sub">Indicadores de plazo, carga y cierre (boceto 02)</p>
      </div>
      <button type="button" class="refresh-mini" :disabled="loading" @click="cargar">
        <font-awesome-icon icon="rotate" :spin="loading" />
        Actualizar
      </button>
    </div>

    <div v-if="loading && !analisis" class="analisis-loading">
      <font-awesome-icon icon="spinner" spin />
      Cargando análisis…
    </div>

    <div v-else-if="errorMessage" class="analisis-error">{{ errorMessage }}</div>

    <template v-else-if="analisis">
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Activas</span>
          <span class="kpi-value">{{ analisis.resumen.activas }}</span>
        </div>
        <div class="kpi-card kpi-warn">
          <span class="kpi-label">Vencidas</span>
          <span class="kpi-value">{{ analisis.resumen.vencidas }}</span>
        </div>
        <div class="kpi-card kpi-info">
          <span class="kpi-label">Por vencer (3 días)</span>
          <span class="kpi-value">{{ analisis.resumen.porVencer }}</span>
        </div>
        <div class="kpi-card kpi-ok">
          <span class="kpi-label">Completadas (mes)</span>
          <span class="kpi-value">{{ analisis.resumen.completadasMes }}</span>
        </div>
        <div class="kpi-card kpi-danger">
          <span class="kpi-label">Rechazadas</span>
          <span class="kpi-value">{{ analisis.resumen.rechazadas }}</span>
        </div>
        <div class="kpi-card kpi-muted">
          <span class="kpi-label">Canceladas</span>
          <span class="kpi-value">{{ analisis.resumen.canceladas }}</span>
        </div>
      </div>

      <div class="charts-grid">
        <div v-if="chartEstados" class="chart-card">
          <h3>Distribución por estado</h3>
          <div class="chart-box">
            <Chart type="doughnut" :data="chartEstados" :options="chartOptions" />
          </div>
        </div>
        <div v-if="chartCategorias" class="chart-card">
          <h3>Por categoría</h3>
          <div class="chart-box">
            <Chart type="bar" :data="chartCategorias" :options="{ ...chartOptions, indexAxis: 'y' }" />
          </div>
        </div>
        <div v-if="chartSerie" class="chart-card chart-wide">
          <h3>Cierres por mes (completadas / rechazadas / canceladas)</h3>
          <div class="chart-box chart-box-tall">
            <Chart type="line" :data="chartSerie" :options="chartOptions" />
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
  margin-bottom: 1.25rem;
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

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
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

.chart-wide {
  grid-column: 1 / -1;
}

.chart-box {
  height: 220px;
}

.chart-box-tall {
  height: 260px;
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