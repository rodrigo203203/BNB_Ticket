<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import {
  EquipoCargaResponse,
  EquipoCargaPersonaRow,
  ROLE_LABELS,
  RequestStatus,
  STATUS_LABELS,
  Role,
  formatearFechaCalendarioLaPaz,
  NivelCarga,
} from '@bnb/shared';

const authStore = useAuthStore();
const data = ref<EquipoCargaResponse | null>(null);
const loading = ref(true);
const errorMessage = ref('');

const filtroRol = ref<Role | ''>('');
const filtroArea = ref('');
const filtroNivel = ref<NivelCarga | ''>('');
const ordenCarga = ref<'desc' | 'asc'>('desc');

const esVistaPropia = computed(() => authStore.user?.role === Role.ANALISTA);

async function cargar() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiClient.get<any, any>('/equipo/carga');
    data.value = res.data || res;
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'No se pudo cargar la carga del equipo';
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);

const areasDisponibles = computed(() => {
  if (!data.value) return [] as string[];
  const set = new Set(data.value.personas.map((p) => p.area).filter(Boolean));
  return Array.from(set).sort();
});

const personasFiltradas = computed(() => {
  if (!data.value) return [] as EquipoCargaPersonaRow[];
  let filas = [...data.value.personas];
  if (filtroRol.value) filas = filas.filter((p) => p.role === filtroRol.value);
  if (filtroArea.value) filas = filas.filter((p) => p.area === filtroArea.value);
  if (filtroNivel.value) filas = filas.filter((p) => p.nivel === filtroNivel.value);
  filas.sort((a, b) =>
    ordenCarga.value === 'desc' ? b.puntosCarga - a.puntosCarga : a.puntosCarga - b.puntosCarga,
  );
  return filas;
});

const estadosBarra = [
  RequestStatus.REGISTRADA,
  RequestStatus.EN_ANALISIS,
  RequestStatus.EN_REVISION_COORDINACION,
] as const;

function totalActivasPorEstado(p: EquipoCargaPersonaRow) {
  return estadosBarra.reduce((sum, st) => sum + (p.porEstado[st] ?? 0), 0);
}

function pctSegmento(p: EquipoCargaPersonaRow, st: RequestStatus): number {
  const total = totalActivasPorEstado(p);
  if (!total) return 0;
  return ((p.porEstado[st] ?? 0) / total) * 100;
}

function nivelClass(nivel: string) {
  return `nivel-${nivel}`;
}

function limpiarFiltros() {
  filtroRol.value = '';
  filtroArea.value = '';
  filtroNivel.value = '';
  ordenCarga.value = 'desc';
}
</script>

<template>
  <AppLayout>
    <div class="carga-page">
      <div class="carga-header">
        <div>
          <h1 class="page-title">{{ esVistaPropia ? 'Mi carga de trabajo' : 'Carga del equipo' }}</h1>
          <p class="page-subtitle">
            Vista operativa de activas, vencidas y próximas entregas. Por defecto ordenada de mayor a
            menor carga.
          </p>
        </div>
        <button type="button" class="refresh-btn" :disabled="loading" @click="cargar">
          <font-awesome-icon icon="rotate" :spin="loading" />
          Actualizar
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <font-awesome-icon icon="spinner" spin />
        Calculando carga…
      </div>

      <div v-else-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <template v-else-if="data">
        <div class="resumen-grid">
          <div class="resumen-card">
            <span class="resumen-label">Encargados</span>
            <span class="resumen-value">{{ data.resumen.personas }}</span>
          </div>
          <div class="resumen-card">
            <span class="resumen-label">Activas totales</span>
            <span class="resumen-value">{{ data.resumen.activasTotales }}</span>
          </div>
          <div class="resumen-card warn">
            <span class="resumen-label">Vencidas</span>
            <span class="resumen-value text-vencida">{{ data.resumen.vencidasTotales }}</span>
          </div>
          <div class="resumen-card info">
            <span class="resumen-label">Por vencer (3 días)</span>
            <span class="resumen-value">{{ data.resumen.porVencerTotales }}</span>
          </div>
        </div>

        <div v-if="!esVistaPropia" class="filtros-bar">
          <label class="filtro-field">
            <span>Rol</span>
            <select v-model="filtroRol" class="filtro-select">
              <option value="">Todos</option>
              <option :value="Role.ANALISTA">{{ ROLE_LABELS[Role.ANALISTA] }}</option>
              <option :value="Role.COORDINADOR">{{ ROLE_LABELS[Role.COORDINADOR] }}</option>
              <option :value="Role.ADMINISTRADOR">{{ ROLE_LABELS[Role.ADMINISTRADOR] }}</option>
            </select>
          </label>
          <label class="filtro-field">
            <span>Área</span>
            <select v-model="filtroArea" class="filtro-select">
              <option value="">Todas</option>
              <option v-for="a in areasDisponibles" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
          <label class="filtro-field">
            <span>Carga</span>
            <select v-model="filtroNivel" class="filtro-select">
              <option value="">Todos los niveles</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label class="filtro-field">
            <span>Ordenar</span>
            <select v-model="ordenCarga" class="filtro-select">
              <option value="desc">Mayor a menor</option>
              <option value="asc">Menor a mayor</option>
            </select>
          </label>
          <button type="button" class="btn-limpiar" @click="limpiarFiltros">Limpiar filtros</button>
        </div>

        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Encargado</th>
                <th>Puntos</th>
                <th>Nivel</th>
                <th>Activas por estado</th>
                <th>Vencidas</th>
                <th>Por vencer</th>
                <th class="hide-mobile">Próx. entrega</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in personasFiltradas" :key="p.id">
                <td>
                  <strong>{{ p.fullName }}</strong>
                  <small class="email-sub">{{ p.email }}</small>
                  <small class="rol-area">{{ ROLE_LABELS[p.role] }} · {{ p.area }}</small>
                </td>
                <td>{{ p.puntosCarga }}</td>
                <td>
                  <span class="nivel-pill" :class="nivelClass(p.nivel)"
                    >{{ p.nivel }} · {{ p.puntosCarga }} pts</span
                  >
                </td>
                <td>
                  <div class="stack-bar" :title="`${p.activas} activas`">
                    <span
                      v-for="st in estadosBarra"
                      :key="st"
                      class="stack-seg"
                      :class="`seg-${st.toLowerCase()}`"
                      :style="{ width: pctSegmento(p, st) + '%' }"
                    >
                      <template v-if="(p.porEstado[st] ?? 0) > 0">{{ p.porEstado[st] }}</template>
                    </span>
                  </div>
                  <small class="stack-legend">
                    <template v-for="st in estadosBarra" :key="st">
                      <span v-if="(p.porEstado[st] ?? 0) > 0"
                        >{{ STATUS_LABELS[st] }}: {{ p.porEstado[st] }}
                      </span>
                    </template>
                  </small>
                </td>
                <td class="col-vencida">{{ p.vencidas }}</td>
                <td>{{ p.porVencer }}</td>
                <td class="hide-mobile">
                  <template v-if="p.proximaFechaEntrega">
                    <span :class="{ 'entrega-atrasada': p.proximaEntregaAtrasada }">
                      <template v-if="p.proximaEntregaAtrasada">Entrega atrasada: </template>
                      {{ formatearFechaCalendarioLaPaz(p.proximaFechaEntrega) }}
                    </span>
                    <small v-if="p.proximaSolicitudCodigo">({{ p.proximaSolicitudCodigo }})</small>
                  </template>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.carga-page {
  max-width: 1100px;
  margin: 0 auto;
}

.carga-header {
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
}

.page-subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.refresh-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}

.filtros-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.filtro-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #64748b;
}

.filtro-select {
  min-width: 150px;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.btn-limpiar {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.resumen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.resumen-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.85rem 1rem;
}

.text-vencida {
  color: #dc2626 !important;
}

.resumen-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  color: #64748b;
}

.resumen-value {
  font-size: 1.4rem;
  font-weight: 700;
}

.table-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 0.8rem;
}

.email-sub,
.rol-area {
  display: block;
  color: #94a3b8;
  font-size: 0.78rem;
}

.rol-area {
  color: #64748b;
}

.col-vencida {
  color: #dc2626;
  font-weight: 600;
}

.nivel-pill {
  text-transform: capitalize;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.nivel-baja {
  background: #dcfce7;
  color: #166534;
}

.nivel-media {
  background: #fef3c7;
  color: #92400e;
}

.nivel-alta {
  background: #fee2e2;
  color: #991b1b;
}

.stack-bar {
  display: flex;
  height: 22px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  min-width: 120px;
}

.stack-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: #0f172a;
  min-width: 2px;
}

.seg-registrada {
  background: #bae6fd;
}

.seg-en_analisis {
  background: #fde68a;
}

.seg-en_revision_coordinacion {
  background: #ddd6fe;
}

.stack-legend {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  color: #64748b;
}

.loading-state,
.error-banner {
  padding: 2rem;
  text-align: center;
}

.error-banner {
  color: #b91c1c;
  background: #fef2f2;
  border-radius: 8px;
}

.entrega-atrasada {
  color: #dc2626;
  font-weight: 600;
}

@media (max-width: 768px) {
  .hide-mobile {
    display: none;
  }
}

@media (max-width: 1024px) {
  .data-table th:first-child,
  .data-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    background: #fff;
    box-shadow: 4px 0 8px -4px rgba(15, 23, 42, 0.1);
  }
  .data-table th:first-child {
    z-index: 3;
    background: #f8fafc;
  }
}
</style>