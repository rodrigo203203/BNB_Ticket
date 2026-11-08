<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import {
  SolicitudItem,
  STATUS_LABELS,
  CATEGORY_LABELS,
  Role,
  RequestStatus,
  ALLOWED_STATUS_TRANSITIONS,
} from '@bnb/shared';

const route = useRoute();
const authStore = useAuthStore();

const solicitud = ref<SolicitudItem | null>(null);
const loading = ref(true);
const errorMessage = ref('');

// Modal de Asignación
const showAssignModal = ref(false);
const assignableUsers = ref<Array<{ id: string; fullName: string; email: string; role: Role; area: string }>>([]);
const selectedAnalystId = ref('');
const assignComment = ref('');
const assigning = ref(false);

// Modal de Cambio de Estado
const showStatusModal = ref(false);
const targetStatus = ref<RequestStatus | null>(null);
const statusComment = ref('');
const updatingStatus = ref(false);

// Agregar Comentario
const newComment = ref('');
const addingComment = ref(false);

const isManager = computed(() => {
  return authStore.user?.role === Role.COORDINADOR || authStore.user?.role === Role.ADMINISTRADOR;
});

const availableTransitions = computed(() => {
  if (!solicitud.value || !authStore.user) return [];
  const current = solicitud.value.status;
  const roleTransitions = ALLOWED_STATUS_TRANSITIONS[authStore.user.role];
  if (!roleTransitions) return [];
  return roleTransitions[current] || [];
});

async function loadSolicitud() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const id = route.params.id as string;
    const res = await apiClient.get<any, any>(`/solicitudes/${id}`);
    solicitud.value = res.data || res;
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Error al cargar la solicitud';
  } finally {
    loading.value = false;
  }
}

async function openAssignModal() {
  try {
    const res = await apiClient.get<any, any>('/users/assignable');
    assignableUsers.value = res.data || res || [];
    selectedAnalystId.value = solicitud.value?.assignedAnalystId || (assignableUsers.value[0]?.id ?? '');
    assignComment.value = '';
    showAssignModal.value = true;
  } catch (err: any) {
    alert('Error al cargar analistas disponibles: ' + (err.response?.data?.message || err.message));
  }
}

async function handleAssign() {
  if (!selectedAnalystId.value || !solicitud.value) return;

  assigning.value = true;
  try {
    const res = await apiClient.patch<any, any>(`/solicitudes/${solicitud.value.id}/assign`, {
      analystId: selectedAnalystId.value,
      comment: assignComment.value.trim() || undefined,
    });
    solicitud.value = res.data || res;
    showAssignModal.value = false;
  } catch (err: any) {
    alert('Error al asignar encargado: ' + (err.response?.data?.message || err.message));
  } finally {
    assigning.value = false;
  }
}

function openStatusModal(status: RequestStatus) {
  targetStatus.value = status;
  statusComment.value = '';
  showStatusModal.value = true;
}

async function handleUpdateStatus() {
  if (!targetStatus.value || !solicitud.value) return;

  updatingStatus.value = true;
  try {
    const res = await apiClient.patch<any, any>(`/solicitudes/${solicitud.value.id}/status`, {
      status: targetStatus.value,
      comment: statusComment.value.trim() || undefined,
    });
    solicitud.value = res.data || res;
    showStatusModal.value = false;
  } catch (err: any) {
    alert('Error al cambiar de estado: ' + (err.response?.data?.message || err.message));
  } finally {
    updatingStatus.value = false;
  }
}

async function handleAddComment() {
  if (!newComment.value.trim() || !solicitud.value) return;

  addingComment.value = true;
  try {
    const res = await apiClient.post<any, any>(`/solicitudes/${solicitud.value.id}/comments`, {
      comment: newComment.value.trim(),
    });
    solicitud.value = res.data || res;
    newComment.value = '';
  } catch (err: any) {
    alert('Error al agregar comentario: ' + (err.response?.data?.message || err.message));
  } finally {
    addingComment.value = false;
  }
}

onMounted(() => {
  loadSolicitud();
});
</script>

<template>
  <AppLayout>
    <div class="detail-container">
      <div class="breadcrumb-nav">
        <router-link to="/solicitudes" class="back-link">
          <font-awesome-icon icon="arrow-left" />
          <span>Volver a Solicitudes</span>
        </router-link>
      </div>

      <div v-if="loading" class="loading-state">
        <font-awesome-icon icon="spinner" spin class="loading-spinner" />
        <p>Cargando información del ticket...</p>
      </div>

      <div v-else-if="errorMessage" class="error-banner">
        <font-awesome-icon icon="circle-exclamation" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-else-if="solicitud" class="ticket-view">
        <!-- Encabezado Principal del Ticket -->
        <div class="ticket-header-card">
          <div class="header-main">
            <div class="badges-row">
              <span class="ticket-code">{{ solicitud.code }}</span>
              <span :class="['badge-status', solicitud.status.toLowerCase()]">
                {{ STATUS_LABELS[solicitud.status] }}
              </span>
              <span :class="['priority-pill', solicitud.priority.toLowerCase()]">
                {{ solicitud.priority }}
              </span>
              <span class="category-tag">{{ CATEGORY_LABELS[solicitud.category] }}</span>
            </div>
            <h1 class="ticket-title">{{ solicitud.title }}</h1>
            <div class="ticket-meta">
              <span>Registrado el {{ new Date(solicitud.createdAt).toLocaleString() }}</span>
              <span v-if="solicitud.closedAt" class="closed-tag">
                • Cerrado el {{ new Date(solicitud.closedAt).toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Barra de Acciones según Rol -->
          <div class="header-actions">
            <button
              v-if="isManager"
              class="btn-action btn-assign"
              @click="openAssignModal"
            >
              <font-awesome-icon icon="user-plus" />
              <span>{{ solicitud.assignedAnalystId ? 'Reasignar Encargado' : 'Asignar Encargado' }}</span>
            </button>

            <!-- Transiciones autorizadas según la matriz RBAC -->
            <button
              v-for="st in availableTransitions"
              :key="st"
              class="btn-action btn-transition"
              :class="{
                'btn-approve': st === RequestStatus.APROBADA,
                'btn-reject': st === RequestStatus.RECHAZADA || st === RequestStatus.CANCELADA,
                'btn-process': st === RequestStatus.EN_ANALISIS || st === RequestStatus.EN_REVISION_COORDINACION
              }"
              @click="openStatusModal(st)"
            >
              <font-awesome-icon v-if="st === RequestStatus.APROBADA" icon="check" />
              <font-awesome-icon v-else-if="st === RequestStatus.RECHAZADA || st === RequestStatus.CANCELADA" icon="ban" />
              <font-awesome-icon v-else icon="rotate" />
              <span>Pasar a {{ STATUS_LABELS[st] }}</span>
            </button>
          </div>
        </div>

        <!-- Contenido Dividido en 2 Columnas -->
        <div class="ticket-body-grid">
          <!-- Columna Izquierda: Detalles, Encargado, Justificación -->
          <div class="ticket-left-column">
            <!-- Tarjeta de Responsable y Solicitante -->
            <div class="cards-duo">
              <div class="info-card">
                <div class="card-caption">Solicitante</div>
                <div class="card-value">{{ solicitud.requesterName }}</div>
                <div class="card-sub">{{ solicitud.requesterArea }}</div>
              </div>

              <div class="info-card" :class="{ 'unassigned-card': !solicitud.assignedAnalystId }">
                <div class="card-caption">Encargado Responsable</div>
                <div class="card-value">
                  {{ solicitud.assignedAnalystName || 'Sin asignar' }}
                </div>
                <div class="card-sub">
                  {{ solicitud.assignedAnalystId ? 'Gerencia de Datos BNB' : 'Pendiente de asignación' }}
                </div>
              </div>
            </div>

            <!-- Tarjeta de Alcance y Descripción -->
            <div class="content-box">
              <h3 class="box-title">Descripción y Requerimiento Técnico</h3>
              <p class="description-text">{{ solicitud.description }}</p>
            </div>

            <!-- Justificación si existe -->
            <div v-if="solicitud.justification" class="content-box justification-box">
              <h3 class="box-title">Justificación de Negocio / Regulatoria</h3>
              <p class="description-text">{{ solicitud.justification }}</p>
            </div>

            <!-- Formulario de Agregar Comentario / Avance -->
            <div class="content-box">
              <h3 class="box-title">Registrar Nota o Avance Técnico</h3>
              <form @submit.prevent="handleAddComment" class="comment-form">
                <textarea
                  v-model="newComment"
                  rows="3"
                  class="comment-input"
                  placeholder="Escribe un avance, consulta o actualización de trabajo sobre el ticket..."
                  required
                ></textarea>
                <div class="comment-actions">
                  <button type="submit" class="btn-primary" :disabled="addingComment || !newComment.trim()">
                    <font-awesome-icon v-if="addingComment" icon="spinner" spin />
                    <font-awesome-icon v-else icon="comment" />
                    <span>Publicar Nota</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Columna Derecha: Línea de Tiempo / Bitácora de Auditoría -->
          <div class="ticket-right-column">
            <div class="timeline-box">
              <h3 class="box-title">
                <font-awesome-icon icon="clock" />
                <span>Línea de Tiempo y Bitácora</span>
              </h3>

              <div v-if="!solicitud.history || solicitud.history.length === 0" class="empty-timeline">
                No hay eventos registrados en la bitácora.
              </div>

              <div v-else class="timeline-list">
                <div
                  v-for="(hist, idx) in solicitud.history"
                  :key="hist.id"
                  class="timeline-item"
                >
                  <div class="timeline-marker">
                    <div class="marker-dot"></div>
                    <div v-if="idx < solicitud.history.length - 1" class="marker-line"></div>
                  </div>
                  <div class="timeline-content">
                    <div class="timeline-head">
                      <span class="timeline-author">{{ hist.authorName }}</span>
                      <span class="timeline-date">{{ new Date(hist.createdAt).toLocaleString() }}</span>
                    </div>
                    <div class="timeline-badge-row">
                      <span :class="['badge-status-sm', hist.newStatus.toLowerCase()]">
                        {{ STATUS_LABELS[hist.newStatus] }}
                      </span>
                    </div>
                    <p class="timeline-comment">{{ hist.comment }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Asignación de Encargado (Manager) -->
    <div v-if="showAssignModal" class="modal-backdrop" @click.self="showAssignModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title">Asignar Encargado a la Solicitud</h2>
          <button class="modal-close" @click="showAssignModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            Selecciona el analista o personal responsable de la Gerencia de Datos para atender este requerimiento.
            <em>(Regla: No es posible asignar a usuarios con rol Solicitante)</em>.
          </p>

          <div class="form-group">
            <label for="analystSelect">Encargado Responsable <span class="required">*</span></label>
            <select id="analystSelect" v-model="selectedAnalystId" class="form-control" required>
              <option disabled value="">Seleccione un encargado...</option>
              <option v-for="u in assignableUsers" :key="u.id" :value="u.id">
                {{ u.fullName }} — {{ u.role }} ({{ u.area }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="assignNote">Instrucción / Nota de Asignación</label>
            <textarea
              id="assignNote"
              v-model="assignComment"
              rows="3"
              class="form-control"
              placeholder="Ej. Priorizar variables de cartera y validar cruce ASFI con el solicitante."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showAssignModal = false">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="assigning || !selectedAnalystId"
            @click="handleAssign"
          >
            <font-awesome-icon v-if="assigning" icon="spinner" spin />
            <font-awesome-icon v-else icon="check" />
            <span>{{ assigning ? 'Asignando...' : 'Confirmar Asignación' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Cambio de Estado -->
    <div v-if="showStatusModal" class="modal-backdrop" @click.self="showStatusModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title">Confirmar Cambio de Estado</h2>
          <button class="modal-close" @click="showStatusModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            La solicitud pasará al estado:
            <strong>{{ targetStatus ? STATUS_LABELS[targetStatus] : '' }}</strong>.
          </p>

          <div class="form-group">
            <label for="statusComment">Motivo / Comentario del Cambio</label>
            <textarea
              id="statusComment"
              v-model="statusComment"
              rows="3"
              class="form-control"
              placeholder="Escribe el justificativo, observaciones o detalles de entrega..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="showStatusModal = false">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="updatingStatus"
            @click="handleUpdateStatus"
          >
            <font-awesome-icon v-if="updatingStatus" icon="spinner" spin />
            <font-awesome-icon v-else icon="check" />
            <span>{{ updatingStatus ? 'Actualizando...' : 'Confirmar Cambio' }}</span>
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.detail-container {
  max-width: 1200px;
  margin: 0 auto;
}

.breadcrumb-nav {
  margin-bottom: 1rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--bnb-purple);
}

.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
}

.loading-spinner {
  font-size: 2.5rem;
  color: var(--bnb-green);
  margin-bottom: 1rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}

.ticket-header-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.75rem 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.badges-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.ticket-code {
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.ticket-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.4rem 0;
}

.ticket-meta {
  color: #64748b;
  font-size: 0.85rem;
}

.closed-tag {
  color: #16a34a;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn-action {
  padding: 0.65rem 1.15rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-assign {
  background: var(--bnb-purple);
  color: #ffffff;
  border: none;
}

.btn-assign:hover {
  background: #4c1d95;
}

.btn-transition {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.btn-transition:hover {
  background: #f8fafc;
}

.btn-approve {
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
}

.btn-approve:hover {
  background: var(--bnb-green-hover);
}

.btn-reject {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.btn-reject:hover {
  background: #fecaca;
}

.btn-process {
  background: var(--bnb-purple-light);
  color: var(--bnb-purple);
  border: 1px solid #ddd6fe;
}

.ticket-body-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
}

.ticket-left-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cards-duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.15rem;
}

.unassigned-card {
  border-left: 4px solid #f59e0b;
}

.card-caption {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.card-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e293b;
}

.card-sub {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.content-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.5rem;
}

.justification-box {
  border-left: 4px solid var(--bnb-purple);
}

.box-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.85rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.description-text {
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
  font-size: 0.95rem;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comment-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
  resize: vertical;
}

.comment-input:focus {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 3px rgba(38, 180, 96, 0.15);
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.65rem 1.25rem;
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--bnb-green-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.65rem 1.15rem;
  background: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.timeline-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.5rem;
}

.empty-timeline {
  color: #94a3b8;
  font-size: 0.88rem;
  text-align: center;
  padding: 2rem 0;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
}

.timeline-item {
  display: flex;
  gap: 1rem;
  position: relative;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}

.marker-dot {
  width: 12px;
  height: 12px;
  background: var(--bnb-green);
  border-radius: 50%;
  margin-top: 4px;
}

.marker-line {
  flex: 1;
  width: 2px;
  background: #e2e8f0;
  margin: 4px 0;
  min-height: 24px;
}

.timeline-content {
  flex: 1;
  padding-bottom: 1.5rem;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.timeline-author {
  font-size: 0.88rem;
  font-weight: 700;
  color: #1e293b;
}

.timeline-date {
  font-size: 0.72rem;
  color: #94a3b8;
}

.timeline-badge-row {
  margin: 0.3rem 0;
}

.badge-status-sm {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.badge-status-sm.registrada { background: #e0f2fe; color: #0369a1; }
.badge-status-sm.en_analisis { background: #fef3c7; color: #b45309; }
.badge-status-sm.en_revision_coordinacion { background: #f3e8ff; color: #7e22ce; }
.badge-status-sm.aprobada { background: #dcfce7; color: #15803d; }
.badge-status-sm.rechazada, .badge-status-sm.cancelada { background: #fee2e2; color: #b91c1c; }

.timeline-comment {
  font-size: 0.85rem;
  color: #475569;
  line-height: 1.5;
  margin: 0.25rem 0 0 0;
  background: #f8fafc;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}

/* Modal Styling */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-dialog {
  background: #ffffff;
  border-radius: 12px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.modal-desc {
  font-size: 0.88rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.required {
  color: #dc2626;
}

.form-control {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
}

.form-control:focus {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 3px rgba(38, 180, 96, 0.15);
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.detail-container,
.ticket-view,
.ticket-body-grid {
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 900px) {
  .ticket-body-grid {
    grid-template-columns: 1fr;
  }
  .cards-duo {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .ticket-header-card .header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .badges-row {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
