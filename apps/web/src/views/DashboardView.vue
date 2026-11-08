<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth.store';
import { useDashboardStore } from '../stores/dashboard.store';
import { Role, STATUS_LABELS } from '@bnb/shared';

const router = useRouter();
const authStore = useAuthStore();
const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.fetchMetrics();
});
</script>

<template>
  <AppLayout>
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">Panel de Control</h1>
        <p class="page-subtitle">
          Bienvenido, {{ authStore.user?.fullName }} · Visión operativa para
          <strong>{{ authStore.user?.role }}</strong>
        </p>
      </div>
      <div class="header-btns">
        <router-link to="/solicitudes/nueva" class="btn-new-header">
          <font-awesome-icon icon="plus" />
          <span>Nueva Solicitud</span>
        </router-link>
        <button class="refresh-btn" @click="dashboardStore.fetchMetrics" :disabled="dashboardStore.loading">
          <font-awesome-icon icon="rotate" :spin="dashboardStore.loading" />
          <span>Actualizar Datos</span>
        </button>
      </div>
    </div>

    <!-- Indicador de carga -->
    <div v-if="dashboardStore.loading && !dashboardStore.metrics" class="loading-state">
      <font-awesome-icon icon="spinner" spin size="2x" />
      <p>Consultando métricas en tiempo real...</p>
    </div>

    <div v-else-if="dashboardStore.metrics" class="dashboard-content">
      <!-- 1. VISTA SOLICITANTE -->
      <section v-if="dashboardStore.metrics.role === Role.SOLICITANTE" class="role-section">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Total Solicitudes</span>
            <span class="stat-value">{{ dashboardStore.metrics.data.totalSolicitudes }}</span>
            <font-awesome-icon icon="folder" class="stat-icon icon-blue" />
          </div>
          <div class="stat-card">
            <span class="stat-label">En Proceso / Análisis</span>
            <span class="stat-value">{{ dashboardStore.metrics.data.enProceso }}</span>
            <font-awesome-icon icon="clock" class="stat-icon icon-amber" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Aprobadas / Resueltas</span>
            <span class="stat-value text-bnb-green">{{ dashboardStore.metrics.data.aprobadas }}</span>
            <font-awesome-icon icon="circle-check" class="stat-icon icon-green" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Rechazadas / Canceladas</span>
            <span class="stat-value text-red">{{ dashboardStore.metrics.data.rechazadas }}</span>
            <font-awesome-icon icon="circle-xmark" class="stat-icon icon-red" />
          </div>
        </div>

        <div class="card-table">
          <div class="card-header">
            <h3>Mis Solicitudes Recientes</h3>
            <router-link to="/solicitudes" class="link-btn">Ver todas</router-link>
          </div>
          <table class="data-table data-table--cards">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th class="hide-mobile">Categoría</th>
                <th>Estado</th>
                <th class="hide-mobile">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dashboardStore.metrics.data.misSolicitudesRecientes" :key="item.id" class="clickable-row" @click="router.push('/solicitudes/' + item.id)">
                <td data-label="Código"><strong>{{ item.code }}</strong></td>
                <td data-label="Título">{{ item.title }}</td>
                <td class="hide-mobile" data-label="Categoría"><span class="category-tag">{{ item.category }}</span></td>
                <td data-label="Estado"><span :class="['badge-status', item.status.toLowerCase()]">{{ STATUS_LABELS[item.status] }}</span></td>
                <td class="hide-mobile" data-label="Fecha">{{ new Date(item.createdAt).toLocaleDateString() }}</td>
              </tr>
              <tr v-if="dashboardStore.metrics.data.misSolicitudesRecientes.length === 0">
                <td colspan="5" class="empty-cell">No registra solicitudes recientes.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2. VISTA ANALISTA -->
      <section v-else-if="dashboardStore.metrics.role === Role.ANALISTA" class="role-section">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Asignadas a Mí</span>
            <span class="stat-value">{{ dashboardStore.metrics.data.asignadas }}</span>
            <font-awesome-icon icon="clipboard-list" class="stat-icon icon-blue" />
          </div>
          <div class="stat-card">
            <span class="stat-label">En Análisis Técnico</span>
            <span class="stat-value text-amber">{{ dashboardStore.metrics.data.enAnalisis }}</span>
            <font-awesome-icon icon="magnifying-glass-chart" class="stat-icon icon-amber" />
          </div>
          <div class="stat-card">
            <span class="stat-label">En Revisión Coordinación</span>
            <span class="stat-value text-purple">{{ dashboardStore.metrics.data.enRevisionCoordinacion }}</span>
            <font-awesome-icon icon="list-check" class="stat-icon icon-purple" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Completadas este Mes</span>
            <span class="stat-value text-bnb-green">{{ dashboardStore.metrics.data.completadasMes }}</span>
            <font-awesome-icon icon="trophy" class="stat-icon icon-green" />
          </div>
        </div>

        <div class="card-table">
          <div class="card-header">
            <h3>Bandeja de Trabajo Pendiente</h3>
            <router-link to="/solicitudes" class="link-btn">Gestionar Tickets</router-link>
          </div>
          <table class="data-table data-table--cards">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th class="hide-mobile">Solicitante</th>
                <th class="hide-mobile">Prioridad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dashboardStore.metrics.data.solicitudesPendientes" :key="item.id" class="clickable-row" @click="router.push('/solicitudes/' + item.id)">
                <td data-label="Código"><strong>{{ item.code }}</strong></td>
                <td data-label="Título">{{ item.title }}</td>
                <td class="hide-mobile" data-label="Solicitante">{{ item.requesterName }} ({{ item.requesterArea }})</td>
                <td class="hide-mobile" data-label="Prioridad"><span :class="['priority-pill', item.priority.toLowerCase()]">{{ item.priority }}</span></td>
                <td data-label="Estado"><span :class="['badge-status', item.status.toLowerCase()]">{{ STATUS_LABELS[item.status] }}</span></td>
              </tr>
              <tr v-if="dashboardStore.metrics.data.solicitudesPendientes.length === 0">
                <td colspan="5" class="empty-cell">No hay requerimientos en curso asignados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 3. VISTA COORDINADOR -->
      <section v-else-if="dashboardStore.metrics.role === Role.COORDINADOR" class="role-section">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Aprobaciones Pendientes</span>
            <span class="stat-value text-purple">{{ dashboardStore.metrics.data.pendientesRevision }}</span>
            <font-awesome-icon icon="triangle-exclamation" class="stat-icon icon-purple" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Solicitudes Activas</span>
            <span class="stat-value">{{ dashboardStore.metrics.data.totalActivas }}</span>
            <font-awesome-icon icon="layer-group" class="stat-icon icon-blue" />
          </div>
        </div>

        <div class="dashboard-dual-column">
          <div class="card-table">
            <div class="card-header">
              <h3>Solicitudes por Aprobar / Revisar</h3>
            </div>
            <table class="data-table data-table--cards">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th class="hide-mobile">Analista</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in dashboardStore.metrics.data.solicitudesPorAprobar" :key="item.id" class="clickable-row" @click="router.push('/solicitudes/' + item.id)">
                  <td data-label="Código"><strong>{{ item.code }}</strong></td>
                  <td data-label="Título">{{ item.title }}</td>
                  <td class="hide-mobile" data-label="Analista">{{ item.assignedAnalystName || 'Sin Asignar' }}</td>
                  <td data-label="Acción">
                    <router-link to="/solicitudes" class="table-action-link">Revisar</router-link>
                  </td>
                </tr>
                <tr v-if="dashboardStore.metrics.data.solicitudesPorAprobar.length === 0">
                  <td colspan="4" class="empty-cell">Bandeja de coordinación al día.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card-table">
            <div class="card-header">
              <h3>Carga por Analista de Datos</h3>
            </div>
            <div class="analyst-list">
              <div
                v-for="analyst in dashboardStore.metrics.data.solicitudesPorAnalista"
                :key="analyst.analystName"
                class="analyst-item"
              >
                <span>{{ analyst.analystName }}</span>
                <span class="badge-count">{{ analyst.count }} tickets</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. VISTA ADMINISTRADOR -->
      <section v-else-if="dashboardStore.metrics.role === Role.ADMINISTRADOR" class="role-section">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Total Usuarios</span>
            <span class="stat-value">{{ dashboardStore.metrics.data.totalUsuarios }}</span>
            <font-awesome-icon icon="users" class="stat-icon icon-blue" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Sesiones Activas</span>
            <span class="stat-value text-bnb-green">{{ dashboardStore.metrics.data.sesionesActivas }}</span>
            <font-awesome-icon icon="shield-halved" class="stat-icon icon-green" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Solicitudes</span>
            <span class="stat-value">{{ dashboardStore.metrics.data.solicitudesTotales }}</span>
            <font-awesome-icon icon="database" class="stat-icon icon-purple" />
          </div>
          <div class="stat-card">
            <span class="stat-label">Cuentas Bloqueadas</span>
            <span class="stat-value text-red">{{ dashboardStore.metrics.data.cuentasBloqueadas }}</span>
            <font-awesome-icon icon="user-lock" class="stat-icon icon-red" />
          </div>
        </div>

        <div class="card-table">
          <div class="card-header">
            <h3>Eventos Recientes de Seguridad y Auditoría</h3>
          </div>
          <table class="data-table data-table--cards">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Usuario</th>
                <th>Detalles</th>
                <th class="hide-mobile">IP</th>
                <th class="hide-mobile">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in dashboardStore.metrics.data.ultimosEventosAuditoria" :key="log.id">
                <td data-label="Acción"><span class="audit-action-pill">{{ log.action }}</span></td>
                <td data-label="Usuario">{{ log.userEmail }}</td>
                <td data-label="Detalles">{{ log.details }}</td>
                <td class="hide-mobile" data-label="IP"><code>{{ log.ipAddress || '127.0.0.1' }}</code></td>
                <td class="hide-mobile" data-label="Fecha">{{ new Date(log.createdAt).toLocaleTimeString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--bnb-purple);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.header-btns {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-new-header {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bnb-green);
  color: #ffffff;
  padding: 0.6rem 1.15rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-new-header:hover {
  background: var(--bnb-green-hover);
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}

.clickable-row:hover {
  background: #f8fafc;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  color: #334155;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--bnb-green);
  color: var(--bnb-green);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #64748b;
  gap: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
}

.stat-icon {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  font-size: 1.5rem;
  opacity: 0.7;
}

.icon-blue { color: #3b82f6; }
.icon-amber { color: #f59e0b; }
.icon-green { color: var(--bnb-green); }
.icon-purple { color: var(--bnb-purple); }
.icon-red { color: #ef4444; }

.text-bnb-green { color: var(--bnb-green); }
.text-amber { color: #d97706; }
.text-purple { color: var(--bnb-purple); }
.text-red { color: #ef4444; }

.card-table {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-bottom: 2rem;
  max-width: 100%;
  overflow-x: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.link-btn {
  font-size: 0.85rem;
  color: var(--bnb-green);
  font-weight: 600;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  text-align: left;
  padding: 0.75rem;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
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

.category-tag {
  font-size: 0.78rem;
  color: #475569;
}

.empty-cell {
  text-align: center;
  padding: 2rem !important;
  color: #94a3b8;
}

.dashboard-dual-column {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.analyst-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.analyst-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
}

.badge-count {
  background: var(--bnb-purple-light);
  color: var(--bnb-purple);
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.audit-action-pill {
  font-family: monospace;
  font-size: 0.75rem;
  padding: 0.2rem 0.45rem;
  background: #e2e8f0;
  border-radius: 4px;
  color: #1e293b;
}

.table-action-link {
  color: var(--bnb-green);
  font-weight: 600;
}

@media (max-width: 900px) {
  .dashboard-dual-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
