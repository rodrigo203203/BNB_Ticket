<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { SolicitudGanttItem, STATUS_LABELS } from '@bnb/shared';

const router = useRouter();
const items = ref<SolicitudGanttItem[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const DAY_MS = 86_400_000;
const LEFT_LABEL_W = 220;
const ROW_H = 44;
const HEADER_H = 36;

async function cargar() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiClient.get<any, any>('/solicitudes/gantt');
    items.value = res.data || res || [];
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'No se pudo cargar el Gantt';
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);

const rango = computed(() => {
  if (!items.value.length) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const s of items.value) {
    const start = new Date(s.createdAt).getTime();
    const end = new Date(s.fechaEntrega || s.fechaRequerida || s.createdAt).getTime();
    min = Math.min(min, start);
    max = Math.max(max, end, start);
  }
  max += 2 * DAY_MS;
  return { min, max, span: Math.max(max - min, DAY_MS) };
});

const ticks = computed(() => {
  if (!rango.value) return [];
  const { min, max } = rango.value;
  const out: { x: number; label: string }[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = min + ((max - min) * i) / steps;
    out.push({
      x: (i / steps) * 100,
      label: new Date(t).toLocaleDateString('es-BO', { month: 'short', day: 'numeric' }),
    });
  }
  return out;
});

function barStyle(s: SolicitudGanttItem) {
  if (!rango.value) return {};
  const { min, span } = rango.value;
  const start = new Date(s.createdAt).getTime();
  const end = new Date(s.fechaEntrega || s.fechaRequerida || s.createdAt).getTime();
  const leftPct = ((start - min) / span) * 100;
  const widthPct = Math.max(((end - start) / span) * 100, 1.5);
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
}

</script>

<template>
  <AppLayout>
    <div class="gantt-page">
      <div class="gantt-header">
        <div>
          <h1 class="page-title">Diagrama Gantt</h1>
          <p class="page-subtitle">
            Línea de tiempo por solicitud (boceto 03). Barra discontinua si no hay fecha de entrega comprometida.
          </p>
        </div>
        <button type="button" class="refresh-btn" :disabled="loading" @click="cargar">
          <font-awesome-icon icon="rotate" :spin="loading" />
          Actualizar
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <font-awesome-icon icon="spinner" spin />
        Cargando timeline…
      </div>

      <div v-else-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <div v-else-if="!items.length" class="empty-state">No hay solicitudes para mostrar en el Gantt.</div>

      <div v-else class="gantt-shell">
        <div class="gantt-scroll">
          <div class="gantt-grid" :style="{ minWidth: `${LEFT_LABEL_W + 720}px` }">
            <div class="gantt-row gantt-row-head">
              <div class="gantt-label-col head-col">Solicitud</div>
              <div class="gantt-track-col">
                <div class="tick-row">
                  <span
                    v-for="(t, i) in ticks"
                    :key="i"
                    class="tick"
                    :style="{ left: t.x + '%' }"
                  >
                    {{ t.label }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-for="s in items"
              :key="s.id"
              class="gantt-row"
              @click="router.push('/solicitudes/' + s.id)"
            >
              <div class="gantt-label-col">
                <strong>{{ s.code }}</strong>
                <span class="gantt-title">{{ s.title }}</span>
                <small v-if="s.assignedAnalystName">{{ s.assignedAnalystName }}</small>
              </div>
              <div class="gantt-track-col">
                <div
                  class="gantt-bar"
                  :class="{
                    'gantt-bar--dashed': s.sinFechaEntrega,
                    ['gantt-bar--' + s.status.toLowerCase()]: true,
                  }"
                  :style="barStyle(s)"
                  :title="STATUS_LABELS[s.status]"
                ></div>
                <span
                  v-if="s.fechaRequerida"
                  class="deadline-marker"
                  :style="{
                    left:
                      ((new Date(s.fechaRequerida).getTime() - rango!.min) / rango!.span) * 100 + '%',
                  }"
                  title="Fecha requerida"
                />
              </div>
            </div>
          </div>
        </div>
        <p class="gantt-legend">
          <span class="legend-swatch solid" /> Con fecha de entrega
          <span class="legend-swatch dashed" /> Sin fecha de entrega (compromiso pendiente)
          <span class="legend-deadline" /> Marcador: fecha requerida
        </p>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.gantt-page {
  max-width: 1200px;
  margin: 0 auto;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.page-subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
  max-width: 560px;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
}

.gantt-shell {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
}

.gantt-scroll {
  overflow-x: auto;
}

.gantt-grid {
  display: flex;
  flex-direction: column;
}

.gantt-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #f1f5f9;
  min-height: 44px;
  cursor: pointer;
}

.gantt-row:hover {
  background: #f8fafc;
}

.gantt-row-head {
  cursor: default;
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.8rem;
  color: #64748b;
}

.gantt-label-col {
  width: 220px;
  flex-shrink: 0;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  border-right: 1px solid #e2e8f0;
}

.gantt-title {
  font-size: 0.82rem;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.gantt-track-col {
  position: relative;
  flex: 1;
  min-height: 44px;
}

.tick-row {
  position: relative;
  height: 36px;
  border-bottom: 1px dashed #e2e8f0;
}

.tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.72rem;
  color: #94a3b8;
  top: 8px;
}

.gantt-bar {
  position: absolute;
  top: 14px;
  height: 16px;
  border-radius: 8px;
  background: var(--bnb-green);
  border: 2px solid var(--bnb-green-dark, #1f9750);
}

.gantt-bar--dashed {
  background: rgba(38, 180, 96, 0.15);
  border-style: dashed;
  border-color: var(--bnb-green);
}

.gantt-bar--en_analisis {
  background: #fbbf24;
  border-color: #d97706;
}

.gantt-bar--en_revision_coordinacion {
  background: #c4b5fd;
  border-color: #7c3aed;
}

.deadline-marker {
  position: absolute;
  top: 6px;
  width: 2px;
  height: 32px;
  background: #ef4444;
  transform: translateX(-1px);
}

.gantt-legend {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.legend-swatch {
  display: inline-block;
  width: 24px;
  height: 10px;
  border-radius: 4px;
  margin-right: 0.35rem;
  vertical-align: middle;
}

.legend-swatch.solid {
  background: var(--bnb-green);
}

.legend-swatch.dashed {
  border: 2px dashed var(--bnb-green);
  background: transparent;
  height: 8px;
}

.legend-deadline::before {
  content: '';
  display: inline-block;
  width: 2px;
  height: 14px;
  background: #ef4444;
  margin-right: 0.35rem;
  vertical-align: middle;
}

.loading-state,
.empty-state,
.error-banner {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.error-banner {
  color: #b91c1c;
  background: #fef2f2;
  border-radius: 8px;
}
</style>