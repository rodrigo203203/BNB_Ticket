<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { EquipoCargaResponse, ROLE_LABELS } from '@bnb/shared';

const data = ref<EquipoCargaResponse | null>(null);
const loading = ref(true);
const errorMessage = ref('');

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

function nivelClass(nivel: string) {
  return `nivel-${nivel}`;
}
</script>

<template>
  <AppLayout>
    <div class="carga-page">
      <div class="carga-header">
        <div>
          <h1 class="page-title">Carga del equipo</h1>
          <p class="page-subtitle">
            Vista operativa (boceto 04). Orden ascendente por puntos de carga — ideal para asignar nuevos tickets.
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
            <span class="resumen-value">{{ data.resumen.vencidasTotales }}</span>
          </div>
          <div class="resumen-card info">
            <span class="resumen-label">Por vencer (3 días)</span>
            <span class="resumen-value">{{ data.resumen.porVencerTotales }}</span>
          </div>
        </div>

        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Encargado</th>
                <th>Rol</th>
                <th>Puntos</th>
                <th>Nivel</th>
                <th>Activas</th>
                <th>Vencidas</th>
                <th>Por vencer</th>
                <th class="hide-mobile">Próx. entrega</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in data.personas" :key="p.id">
                <td>
                  <strong>{{ p.fullName }}</strong>
                  <small class="email-sub">{{ p.email }}</small>
                </td>
                <td>{{ ROLE_LABELS[p.role] }}</td>
                <td>{{ p.puntosCarga }}</td>
                <td>
                  <span class="nivel-pill" :class="nivelClass(p.nivel)">{{ p.nivel }}</span>
                </td>
                <td>{{ p.activas }}</td>
                <td>{{ p.vencidas }}</td>
                <td>{{ p.porVencer }}</td>
                <td class="hide-mobile">
                  <template v-if="p.proximaFechaEntrega">
                    {{ new Date(p.proximaFechaEntrega).toLocaleDateString('es-BO') }}
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

.resumen-card.warn .resumen-value {
  color: #b45309;
}

.resumen-card.info .resumen-value {
  color: #2563eb;
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

.email-sub {
  display: block;
  color: #94a3b8;
  font-size: 0.78rem;
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

@media (max-width: 768px) {
  .hide-mobile {
    display: none;
  }
}
</style>