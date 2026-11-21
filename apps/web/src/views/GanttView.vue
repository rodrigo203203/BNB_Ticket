<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import MultiSelect from 'primevue/multiselect';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import {
  SolicitudGanttItem,
  STATUS_LABELS,
  RequestStatus,
  Role,
  GANTT_FIN_BARRA_SIN_ENTREGA,
  ZONA_FECHA_SOLICITUD,
  inicioDiaHoyLaPaz,
  instanteCalendarioLaPaz,
  inicioSemanaCalendarioLaPaz,
  inicioMesCalendarioLaPaz,
  finMesCalendarioLaPaz,
  formatearFechaCalendarioLaPaz,
} from '@bnb/shared';

const router = useRouter();
const authStore = useAuthStore();
const items = ref<SolicitudGanttItem[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const ESTADOS_ACTIVOS_GANTT = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
];

const ESTADOS_FILTRO_OPCIONES = Object.values(RequestStatus).map((st) => ({
  label: STATUS_LABELS[st],
  value: st,
}));

const filtroAnalistas = ref<string[]>([]);
const filtroAreas = ref<string[]>([]);
const filtroEstados = ref<RequestStatus[]>([...ESTADOS_ACTIVOS_GANTT]);

/** Zoom del timeline (boceto 03). */
type ZoomGantt = 'day' | 'week' | 'month';
const zoom = ref<ZoomGantt>('week');

const DAY_MS = 86_400_000;
const LEFT_LABEL_W = 260;
const TRACK_PADDING_END_PCT = 6;

const ESTADOS_GANTT_LEYENDA: RequestStatus[] = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
  RequestStatus.APROBADA,
];

const ZOOM_LABELS: Record<ZoomGantt, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

const opcionesAnalistas = ref<Array<{ id: string; label: string }>>([]);
const opcionesAreas = ref<string[]>([]);

function buildGanttParams(): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (filtroAnalistas.value.length) params.analystIds = filtroAnalistas.value;
  if (filtroAreas.value.length) params.areas = filtroAreas.value;
  if (filtroEstados.value.length) params.statuses = filtroEstados.value;
  return params;
}

async function cargar() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiClient.get<any, any>('/solicitudes/gantt', { params: buildGanttParams() });
    const data: SolicitudGanttItem[] = res.data || res || [];
    items.value = data;
    if (!opcionesAnalistas.value.length) {
      const map = new Map<string, string>();
      for (const s of data) {
        if (s.assignedAnalystId && s.assignedAnalystName) {
          map.set(s.assignedAnalystId, s.assignedAnalystName);
        }
      }
      opcionesAnalistas.value = Array.from(map.entries()).map(([id, label]) => ({ id, label }));
    }
    if (!opcionesAreas.value.length) {
      opcionesAreas.value = [
        ...new Set(data.map((s) => s.requesterArea).filter((a): a is string => Boolean(a))),
      ].sort();
    }
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'No se pudo cargar el Gantt';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (authStore.user?.role === Role.ANALISTA && authStore.user.id) {
    filtroAnalistas.value = [authStore.user.id];
  }
  void cargar();
});

watch([filtroAnalistas, filtroAreas, filtroEstados], () => {
  void cargar();
});

function msCreacion(s: SolicitudGanttItem): number {
  return instanteCalendarioLaPaz(s.createdAt);
}

function msFechaRequerida(s: SolicitudGanttItem): number | null {
  return s.fechaRequerida ? instanteCalendarioLaPaz(s.fechaRequerida) : null;
}

function etiquetaEjeLaPaz(t: number, tipo: 'dayWeek' | 'month'): string {
  if (tipo === 'month') {
    return new Intl.DateTimeFormat('es-BO', {
      timeZone: ZONA_FECHA_SOLICITUD,
      month: 'short',
      day: 'numeric',
    }).format(new Date(t));
  }
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_FECHA_SOLICITUD,
    weekday: 'short',
    day: 'numeric',
  }).format(new Date(t));
}

function finBarraPlanificadaMs(s: SolicitudGanttItem): number {
  if (s.vencida && s.fechaRequerida) {
    return instanteCalendarioLaPaz(s.fechaRequerida);
  }
  return finBarraMs(s);
}

const rango = computed(() => {
  if (!items.value.length) return null;

  const hoy = inicioDiaHoyLaPaz();
  let dataMin = Infinity;
  let dataMax = -Infinity;

  for (const s of items.value) {
    const start = msCreacion(s);
    const end = finBarraMs(s);
    const req = msFechaRequerida(s);
    dataMin = Math.min(dataMin, start, end, req ?? Infinity);
    dataMax = Math.max(dataMax, start, end, req ?? -Infinity);
    if (s.vencida && s.fechaRequerida) {
      dataMax = Math.max(dataMax, hoy);
    }
  }
  dataMax = Math.max(dataMax, hoy);

  let min: number;
  let max: number;

  if (zoom.value === 'day') {
    min = instanteCalendarioLaPaz(new Date(dataMin));
    max = min + 14 * DAY_MS;
    if (dataMax > max) {
      max = instanteCalendarioLaPaz(new Date(dataMax)) + DAY_MS;
      min = max - 14 * DAY_MS;
    }
  } else if (zoom.value === 'week') {
    /** Semana fija que siempre incluye hoy; barras antiguas/futuras se recortan al borde. */
    min = inicioSemanaCalendarioLaPaz(hoy);
    max = min + 7 * DAY_MS;
  } else {
    min = inicioMesCalendarioLaPaz(hoy);
    max = finMesCalendarioLaPaz(hoy);
    if (dataMin < min) {
      min = inicioMesCalendarioLaPaz(dataMin);
    }
    if (dataMax > max) {
      max = finMesCalendarioLaPaz(dataMax);
    }
    if (max - min < 7 * DAY_MS) {
      max = min + 31 * DAY_MS;
    }
  }

  const span = Math.max(max - min, DAY_MS);
  return { min, max, span };
});

const ticks = computed(() => {
  if (!rango.value) return [];
  const { min, max, span } = rango.value;
  const out: { x: number; label: string }[] = [];

  if (zoom.value === 'day') {
    const days = Math.min(14, Math.ceil(span / DAY_MS));
    for (let i = 0; i <= days; i++) {
      const t = min + i * DAY_MS;
      if (t > max) break;
      out.push({
        x: ((t - min) / span) * 100,
        label: etiquetaEjeLaPaz(t, 'dayWeek'),
      });
    }
    return out;
  }

  if (zoom.value === 'week') {
    const dias = Math.min(7, Math.ceil(span / DAY_MS));
    for (let i = 0; i < dias; i++) {
      const t = min + i * DAY_MS;
      if (t > max) break;
      out.push({
        x: ((t - min) / span) * 100,
        label: etiquetaEjeLaPaz(t, 'dayWeek'),
      });
    }
    return out;
  }

  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = min + ((max - min) * i) / steps;
    out.push({
      x: (i / steps) * 100,
      label: etiquetaEjeLaPaz(t, 'month'),
    });
  }
  return out;
});

/** Spark M8: sin entrega, barra punteada hasta fecha requerida (o hoy si faltara dato). */
function finBarraMs(s: SolicitudGanttItem): number {
  const cre = msCreacion(s);
  if (s.fechaEntrega) {
    const ent = instanteCalendarioLaPaz(s.fechaEntrega);
    if (ent >= cre) return ent;
  }
  if (GANTT_FIN_BARRA_SIN_ENTREGA === 'fecha_requerida' && s.fechaRequerida) {
    return instanteCalendarioLaPaz(s.fechaRequerida);
  }
  if (GANTT_FIN_BARRA_SIN_ENTREGA === 'hoy') {
    return inicioDiaHoyLaPaz();
  }
  return s.fechaRequerida ? instanteCalendarioLaPaz(s.fechaRequerida) : inicioDiaHoyLaPaz();
}

function pctEnRango(t: number): number {
  if (!rango.value) return 0;
  const usable = 100 - TRACK_PADDING_END_PCT;
  const raw = ((t - rango.value.min) / rango.value.span) * usable;
  return Math.min(Math.max(raw, 0), usable);
}

/** Segmento recortado al rango visible (M13: posiciones en calendario La Paz). */
function barStyleRango(startMs: number, endMs: number, minWidth = 1.2) {
  if (!rango.value) return { display: 'none' };
  const { min, max } = rango.value;
  if (endMs <= startMs) return { display: 'none' };

  const visStart = Math.max(startMs, min);
  const visEnd = Math.min(endMs, max);
  if (visEnd <= visStart && visEnd <= min) {
    return { display: 'none' };
  }
  if (visEnd <= min || visStart >= max) {
    return { display: 'none' };
  }

  const leftPct = startMs < min ? 0 : pctEnRango(visStart);
  const endPct = pctEnRango(Math.min(visEnd, max));
  const widthPct = Math.max(endPct - leftPct, minWidth);
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
}

function barStyle(s: SolicitudGanttItem) {
  const dashed = s.sinFechaEntrega && !s.fechaEntrega;
  return barStyleRango(msCreacion(s), finBarraPlanificadaMs(s), dashed ? 1.8 : 1.2);
}

function finTramoVencidoMs(s: SolicitudGanttItem): number {
  if (s.fechaEntrega) {
    return instanteCalendarioLaPaz(s.fechaEntrega);
  }
  return inicioDiaHoyLaPaz();
}

function barStyleTramoVencido(s: SolicitudGanttItem) {
  const req = msFechaRequerida(s);
  if (!req || !s.vencida) return { display: 'none' };
  return barStyleRango(req, finTramoVencidoMs(s), 1.2);
}

type MarcadorRequeridaUi =
  | { kind: 'none' }
  | { kind: 'diamond'; style: Record<string, string> }
  | { kind: 'edge'; side: 'left' | 'right' };

function marcadorRequeridaUi(s: SolicitudGanttItem): MarcadorRequeridaUi {
  if (!rango.value || !s.fechaRequerida) return { kind: 'none' };
  const req = instanteCalendarioLaPaz(s.fechaRequerida);
  const { min, max } = rango.value;
  if (req < min) return { kind: 'edge', side: 'left' };
  if (req > max) return { kind: 'edge', side: 'right' };
  return { kind: 'diamond', style: marcadorRequeridaStyle(s) };
}

const lineaHoy = computed(() => {
  if (!rango.value || !items.value.length) return null;
  const t = inicioDiaHoyLaPaz();
  if (t < rango.value.min || t > rango.value.max) return null;
  return {
    x: pctEnRango(t),
    label: `Hoy ${formatearFechaCalendarioLaPaz(new Date())}`,
  };
});

function marcadorRequeridaStyle(s: SolicitudGanttItem): Record<string, string> {
  if (!rango.value || !s.fechaRequerida) return { left: '0%' };
  return { left: `${pctEnRango(instanteCalendarioLaPaz(s.fechaRequerida))}%` };
}

function marcadorDiamondStyle(s: SolicitudGanttItem): Record<string, string> | null {
  const ui = marcadorRequeridaUi(s);
  return ui.kind === 'diamond' ? ui.style : null;
}

function marcadorEdgeSide(s: SolicitudGanttItem): 'left' | 'right' | null {
  const ui = marcadorRequeridaUi(s);
  return ui.kind === 'edge' ? ui.side : null;
}

function etiquetaAnalistaArea(s: SolicitudGanttItem): string {
  const analista = s.assignedAnalystName?.trim() || 'Sin asignar';
  const area = s.requesterArea?.trim() || '—';
  return `${analista} · ${area}`;
}

function analistaSinAsignar(s: SolicitudGanttItem): boolean {
  return !(s.assignedAnalystId || s.assignedAnalystName?.trim());
}

const zoomHint = computed(() => {
  if (!rango.value) return '';
  const a = formatearFechaCalendarioLaPaz(new Date(rango.value.min));
  const finMs =
    zoom.value === 'week' ? rango.value.min + 6 * DAY_MS : rango.value.max;
  const b = formatearFechaCalendarioLaPaz(new Date(finMs));
  return `Vista ${ZOOM_LABELS[zoom.value].toLowerCase()}: ${a} — ${b}`;
});
</script>

<template>
  <AppLayout>
    <div class="gantt-page">
      <div class="gantt-header">
        <div>
          <h1 class="page-title">Diagrama Gantt</h1>
          <p class="page-subtitle">
            Cada barra va de la creación a la fecha de entrega definida por el analista. Sin entrega,
            trazo punteado hasta la fecha requerida; el rombo (◇) marca ese mismo hito en la línea.
          </p>
          <p v-if="zoomHint" class="zoom-hint">{{ zoomHint }}</p>
        </div>
        <div class="gantt-header-actions">
          <div class="zoom-switch" role="group" aria-label="Zoom del timeline">
            <button
              v-for="z in (['day', 'week', 'month'] as ZoomGantt[])"
              :key="z"
              type="button"
              class="zoom-btn"
              :class="{ active: zoom === z }"
              @click="zoom = z"
            >
              {{ ZOOM_LABELS[z] }}
            </button>
          </div>
          <button type="button" class="refresh-btn" :disabled="loading" @click="cargar">
            <font-awesome-icon icon="rotate" :spin="loading" />
            Actualizar
          </button>
        </div>
      </div>

      <div v-if="!loading" class="gantt-filtros">
        <div class="filtro-gantt">
          <span>Analista</span>
          <MultiSelect
            v-model="filtroAnalistas"
            :options="opcionesAnalistas"
            option-label="label"
            option-value="id"
            placeholder="Todos"
            display="chip"
            :max-selected-labels="2"
            :disabled="authStore.user?.role === Role.ANALISTA"
            class="filtro-multiselect"
          />
        </div>
        <div class="filtro-gantt">
          <span>Área</span>
          <MultiSelect
            v-model="filtroAreas"
            :options="opcionesAreas"
            placeholder="Todas"
            display="chip"
            :max-selected-labels="2"
            class="filtro-multiselect"
          />
        </div>
        <div class="filtro-gantt">
          <span>Estado</span>
          <MultiSelect
            v-model="filtroEstados"
            :options="ESTADOS_FILTRO_OPCIONES"
            option-label="label"
            option-value="value"
            placeholder="Activas"
            display="chip"
            :max-selected-labels="2"
            selected-items-label="{0} estados"
            class="filtro-multiselect"
          />
        </div>
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
              <div class="gantt-label-col head-col">
                <span>Solicitud</span>
                <small class="head-sub">Analista · Área</small>
              </div>
              <div class="gantt-track-col track-col-padded">
                <div class="tick-row">
                  <span
                    v-for="(t, i) in ticks"
                    :key="i"
                    class="tick"
                    :style="{ left: t.x + '%' }"
                  >
                    {{ t.label }}
                  </span>
                  <span
                    v-if="lineaHoy"
                    class="hoy-label hoy-label--head"
                    :style="{ left: lineaHoy.x + '%' }"
                  >
                    {{ lineaHoy.label }}
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
                <span class="gantt-title" :title="s.title">{{ s.title }}</span>
                <small
                  class="gantt-analista-area"
                  :class="{ 'sin-asignar': analistaSinAsignar(s) }"
                >
                  {{ etiquetaAnalistaArea(s) }}
                </small>
              </div>
              <div class="gantt-track-col track-col-padded">
                <span v-if="lineaHoy" class="hoy-line" :style="{ left: lineaHoy.x + '%' }" />
                <template v-if="s.vencida && s.fechaRequerida">
                  <div
                    class="gantt-bar"
                    :class="{
                      'gantt-bar--dashed': s.sinFechaEntrega && !s.fechaEntrega,
                      [`gantt-bar--${s.status.toLowerCase()}`]: true,
                    }"
                    :style="barStyle(s)"
                    :title="STATUS_LABELS[s.status]"
                  />
                  <div
                    class="gantt-bar gantt-bar--vencida gantt-bar--overdue-trail"
                    :style="barStyleTramoVencido(s)"
                    title="Tramo vencido"
                  />
                </template>
                <div
                  v-else
                  class="gantt-bar"
                  :class="{
                    'gantt-bar--dashed': s.sinFechaEntrega,
                    [`gantt-bar--${s.status.toLowerCase()}`]: true,
                  }"
                  :style="barStyle(s)"
                  :title="STATUS_LABELS[s.status]"
                />
                <span
                  v-if="marcadorDiamondStyle(s)"
                  class="deadline-marker"
                  :style="marcadorDiamondStyle(s)!"
                  title="Fecha requerida"
                />
                <span
                  v-else-if="marcadorEdgeSide(s)"
                  class="deadline-edge"
                  :class="
                    marcadorEdgeSide(s) === 'left' ? 'deadline-edge--left' : 'deadline-edge--right'
                  "
                  title="Fecha requerida fuera del rango"
                  >{{ marcadorEdgeSide(s) === 'left' ? '→' : '←' }}</span
                >
              </div>
            </div>
          </div>
        </div>
        <p class="gantt-legend">
          <span v-for="st in ESTADOS_GANTT_LEYENDA" :key="st" class="legend-estado">
            <span :class="['legend-dot', `legend-dot--${st.toLowerCase()}`]" />
            {{ STATUS_LABELS[st] }}
          </span>
          <span class="legend-swatch dashed" /> Sin fecha de entrega (creación → fecha requerida)
          <span class="legend-swatch overdue" /> Tramo vencido
          <span class="legend-deadline" /> Fecha requerida (◇)
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

.gantt-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filtro-gantt {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #64748b;
  min-width: 160px;
}

.filtro-multiselect {
  width: 100%;
  min-width: 180px;
  max-width: 260px;
}

.filtro-multiselect :deep(.p-multiselect) {
  width: 100%;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.gantt-header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.zoom-switch {
  display: inline-flex;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.zoom-btn {
  border: none;
  background: transparent;
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: #64748b;
}

.zoom-btn.active {
  background: var(--bnb-green, #26b460);
  color: #fff;
  font-weight: 600;
}

.zoom-hint {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
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

.head-sub {
  display: block;
  font-weight: 500;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.gantt-analista-area {
  font-size: 0.75rem;
  color: #64748b;
}

.gantt-analista-area.sin-asignar {
  color: #dc2626;
  font-weight: 600;
}

.track-col-padded {
  padding-right: 6%;
}

.gantt-label-col {
  width: 260px;
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
  height: 44px;
  border-bottom: 1px dashed #e2e8f0;
}

.tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.72rem;
  color: #94a3b8;
  top: 8px;
  white-space: nowrap;
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

.gantt-bar--vencida {
  background: #ef4444 !important;
  border-color: #b91c1c !important;
  border-style: solid;
}

.gantt-bar--en_analisis:not(.gantt-bar--vencida) {
  background: #fbbf24;
  border-color: #d97706;
}

.gantt-bar--en_revision_coordinacion:not(.gantt-bar--vencida) {
  background: #c4b5fd;
  border-color: #7c3aed;
}

.gantt-bar--registrada:not(.gantt-bar--overdue-trail) {
  background: #38bdf8;
  border-color: #0284c7;
}

.gantt-bar--registrada.gantt-bar--dashed {
  background: rgba(56, 189, 248, 0.18);
  border-color: #0284c7;
}

.deadline-edge {
  position: absolute;
  top: 14px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
  z-index: 3;
  line-height: 1;
}

.deadline-edge--left {
  left: 2px;
}

.deadline-edge--right {
  right: 2px;
}

.hoy-line {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 0;
  border-left: 2px dashed var(--bnb-green, #26b460);
  transform: translateX(-1px);
  pointer-events: none;
  z-index: 2;
}

.hoy-label {
  position: absolute;
  top: -2px;
  transform: translate(-50%, -100%);
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--bnb-green, #26b460);
  white-space: nowrap;
  z-index: 3;
}

.hoy-label--head {
  top: -6px;
  transform: translate(-50%, -100%);
}

.gantt-bar--overdue-trail {
  z-index: 1;
}

.deadline-marker {
  position: absolute;
  top: 16px;
  width: 9px;
  height: 9px;
  background: #e2e8f0;
  border: 2px solid #94a3b8;
  transform: translateX(-50%) rotate(45deg);
  z-index: 2;
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
  border: 2px dashed #94a3b8;
  background: transparent;
  height: 8px;
}

.legend-swatch.overdue {
  background: #ef4444;
}

.legend-estado {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot--registrada {
  background: #38bdf8;
}

.legend-dot--en_analisis {
  background: #fbbf24;
}

.legend-dot--en_revision_coordinacion {
  background: #c4b5fd;
}

.legend-dot--aprobada {
  background: var(--bnb-green);
}

.legend-deadline::before {
  content: '◇';
  margin-right: 0.35rem;
  color: #64748b;
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

/* S6: scroll horizontal en móvil con primera columna fija */
@media (max-width: 1024px) {
  .gantt-shell {
    max-width: 100%;
    overflow: hidden;
  }
  .gantt-scroll {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .gantt-label-col {
    position: sticky;
    left: 0;
    z-index: 3;
    background: #fff;
    box-shadow: 4px 0 8px -4px rgba(15, 23, 42, 0.12);
    width: 148px;
    min-width: 148px;
    max-width: 168px;
  }
  .gantt-row-head .gantt-label-col {
    z-index: 4;
  }
  .gantt-title {
    max-width: 140px;
  }
}
</style>