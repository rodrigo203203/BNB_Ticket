<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { SolicitudItem, STATUS_LABELS, CATEGORY_LABELS } from '@bnb/shared';

const router = useRouter();
const solicitudes = ref<SolicitudItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedStatus = ref('');

async function loadSolicitudes() {
  loading.value = true;
  try {
    const res = await apiClient.get<any, { success: boolean; data: SolicitudItem[] }>('/solicitudes', {
      params: {
        search: searchQuery.value || undefined,
        status: selectedStatus.value || undefined,
      },
    });
    solicitudes.value = res.data || (res as any) || [];
  } catch {
    solicitudes.value = [];
  } finally {
    loading.value = false;
  }
}

function goToDetail(id: string) {
  router.push(`/solicitudes/${id}`);
}

function exportToCSV() {
  if (solicitudes.value.length === 0) {
    alert('No hay solicitudes disponibles para exportar.');
    return;
  }

  const headers = [
    'Código',
    'Título',
    'Categoría',
    'Prioridad',
    'Estado',
    'Solicitante',
    'Área Solicitante',
    'Analista Asignado',
    'Fecha Registro',
  ];

  const rows = solicitudes.value.map((s) => [
    s.code,
    `"${(s.title || '').replace(/"/g, '""')}"`,
    `"${CATEGORY_LABELS[s.category] || s.category}"`,
    s.priority,
    STATUS_LABELS[s.status] || s.status,
    `"${(s.requesterName || '').replace(/"/g, '""')}"`,
    `"${(s.requesterArea || '').replace(/"/g, '""')}"`,
    `"${(s.assignedAnalystName || 'Sin asignar').replace(/"/g, '""')}"`,
    new Date(s.createdAt).toLocaleDateString(),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `BNB_Solicitudes_Datos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

onMounted(() => {
  loadSolicitudes();
});
</script>

<template>
  <AppLayout>
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestión de Solicitudes</h1>
        <p class="view-subtitle">Catálogo institucional y seguimiento de requerimientos de la Gerencia de Datos</p>
      </div>
      <div class="header-actions">
        <button class="btn-export" @click="exportToCSV" title="Exportar solicitudes a formato Excel / CSV">
          <font-awesome-icon icon="file-csv" />
          <span>Exportar CSV</span>
        </button>
        <router-link to="/solicitudes/nueva" class="btn-create">
          <font-awesome-icon icon="plus" />
          <span>Nueva Solicitud</span>
        </router-link>
        <router-link to="/kanban" class="btn-secondary">
          <font-awesome-icon icon="table-columns" />
          <span>Ver Tablero Kanban</span>
        </router-link>
      </div>
    </div>

    <!-- Barra de Búsqueda y Filtro -->
    <div class="filters-row">
      <div class="search-box">
        <font-awesome-icon icon="magnifying-glass" class="search-icon" />
        <input
          v-model="searchQuery"
          @keyup.enter="loadSolicitudes"
          type="text"
          placeholder="Buscar por código o título..."
          class="search-input"
        />
      </div>

      <select v-model="selectedStatus" @change="loadSolicitudes" class="filter-select">
        <option value="">Todos los Estados</option>
        <option v-for="(label, val) in STATUS_LABELS" :key="val" :value="val">
          {{ label }}
        </option>
      </select>

      <button class="btn-primary" @click="loadSolicitudes">
        <span>Buscar</span>
      </button>
    </div>

    <div class="table-container">
      <table class="data-table data-table--cards">
        <thead>
          <tr>
            <th>Código</th>
            <th>Título Requerimiento</th>
            <th class="hide-mobile">Categoría</th>
            <th class="hide-mobile">Prioridad</th>
            <th>Estado</th>
            <th class="hide-mobile">Solicitante</th>
            <th class="hide-mobile">Analista Asignado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in solicitudes"
            :key="item.id"
            class="clickable-row"
            @click="goToDetail(item.id)"
          >
            <td data-label="Código"><strong class="code-badge">{{ item.code }}</strong></td>
            <td data-label="Título">
              <div class="item-title">{{ item.title }}</div>
              <small class="item-desc">{{ item.description }}</small>
            </td>
            <td class="hide-mobile" data-label="Categoría"><span class="category-tag">{{ CATEGORY_LABELS[item.category] || item.category }}</span></td>
            <td class="hide-mobile" data-label="Prioridad"><span :class="['priority-pill', item.priority.toLowerCase()]">{{ item.priority }}</span></td>
            <td data-label="Estado"><span :class="['badge-status', item.status.toLowerCase()]">{{ STATUS_LABELS[item.status] }}</span></td>
            <td class="hide-mobile" data-label="Solicitante">{{ item.requesterName }} <br><small class="text-muted">{{ item.requesterArea }}</small></td>
            <td class="hide-mobile" data-label="Analista">
              <span :class="item.assignedAnalystName ? 'assigned-text' : 'unassigned-text'">
                {{ item.assignedAnalystName || 'Sin asignar' }}
              </span>
            </td>
            <td data-label="Acción">
              <button class="btn-table-action" @click.stop="goToDetail(item.id)">
                Ver Detalle
              </button>
            </td>
          </tr>
          <tr v-if="loading">
            <td colspan="8" class="center-cell">Cargando requerimientos...</td>
          </tr>
          <tr v-else-if="solicitudes.length === 0">
            <td colspan="8" class="center-cell">No se encontraron solicitudes registradas.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppLayout>
</template>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.view-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--bnb-purple);
}

.view-subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.btn-export {
  background: #ffffff;
  border: 1px solid #16a34a;
  color: #16a34a;
  padding: 0.65rem 1.15rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #f0fdf4;
}

.btn-create {
  background: var(--bnb-green);
  color: #ffffff;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-create:hover {
  background: var(--bnb-green-hover);
}

.btn-secondary {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0.65rem 1.15rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8fafc;
  color: var(--bnb-purple);
}

.filters-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 0.65rem 1rem 0.65rem 2.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
}

.search-input:focus {
  border-color: var(--bnb-green);
}

.filter-select {
  padding: 0.65rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #ffffff;
  outline: none;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}

.clickable-row:hover {
  background: #f8fafc;
}

.code-badge {
  font-family: monospace;
  color: #0f172a;
}

.assigned-text {
  color: #1e293b;
  font-weight: 500;
}

.unassigned-text {
  color: #d97706;
  font-style: italic;
}

.btn-table-action {
  padding: 0.35rem 0.75rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bnb-purple);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-table-action:hover {
  background: var(--bnb-purple-light);
  border-color: var(--bnb-purple);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.search-input {
  padding: 0.6rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  width: 260px;
  outline: none;
}

.search-input:focus {
  border-color: var(--bnb-green);
}

.btn-primary {
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--bnb-green-hover);
}

.table-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow-x: hidden;
  max-width: 100%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  background: #f8fafc;
  padding: 0.85rem;
  text-align: left;
  color: #475569;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.item-title {
  font-weight: 600;
  color: #1e293b;
}

.item-desc {
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-muted {
  color: #94a3b8;
}

.center-cell {
  text-align: center;
  padding: 3rem !important;
  color: #94a3b8;
}

.category-tag {
  font-size: 0.75rem;
  color: #475569;
  font-weight: 500;
}

.badge-status {
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-status.registrada { background: #e0f2fe; color: #0369a1; }
.badge-status.en_analisis { background: #fef3c7; color: #b45309; }
.badge-status.en_revision_coordinacion { background: #f3e8ff; color: #7e22ce; }
.badge-status.aprobada { background: #dcfce7; color: #15803d; }
.badge-status.rechazada { background: #fee2e2; color: #b91c1c; }
.badge-status.cancelada { background: #f1f5f9; color: #64748b; }

.priority-pill {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.priority-pill.urgente { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.priority-pill.alta { background: #fff7ed; color: #ea580c; }
.priority-pill.media { background: #f0fdf4; color: #16a34a; }
.priority-pill.baja { background: #f8fafc; color: #64748b; }
</style>
