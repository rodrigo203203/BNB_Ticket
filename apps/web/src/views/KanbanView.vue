<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import AppLayout from '../layouts/AppLayout.vue';
import KanbanColumn, { type KanbanColumnDef } from '../components/kanban/KanbanColumn.vue';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import {
  SolicitudItem,
  RequestStatus,
  CATEGORY_LABELS,
  STATUS_LABELS,
  ALLOWED_STATUS_TRANSITIONS,
} from '@bnb/shared';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const solicitudes = ref<SolicitudItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedCategory = ref<string>('');
const statusUpdating = ref(false);

const columns: ColumnConfig[] = [
  {
    key: RequestStatus.REGISTRADA,
    status: RequestStatus.REGISTRADA,
    label: 'Registradas',
    sub: 'Nuevas solicitudes',
    icon: 'folder',
    badgeClass: 'col-blue',
  },
  {
    key: RequestStatus.EN_ANALISIS,
    status: RequestStatus.EN_ANALISIS,
    label: 'En Análisis',
    sub: 'Atención técnica',
    icon: 'rotate',
    badgeClass: 'col-amber',
  },
  {
    key: RequestStatus.EN_REVISION_COORDINACION,
    status: RequestStatus.EN_REVISION_COORDINACION,
    label: 'En Revisión',
    sub: 'Validación coordinación',
    icon: 'clipboard-list',
    badgeClass: 'col-purple',
  },
  {
    key: RequestStatus.APROBADA,
    status: RequestStatus.APROBADA,
    label: 'Aprobadas',
    sub: 'Entregas conformes',
    icon: 'circle-check',
    badgeClass: 'col-green',
  },
  {
    key: 'terminal',
    status: RequestStatus.RECHAZADA,
    alsoIncludes: [RequestStatus.CANCELADA],
    label: 'Rechazadas / Canceladas',
    sub: 'Cierre negativo',
    icon: 'circle-xmark',
    badgeClass: 'col-red',
  },
];

type ColumnKey =
  | RequestStatus.REGISTRADA
  | RequestStatus.EN_ANALISIS
  | RequestStatus.EN_REVISION_COORDINACION
  | RequestStatus.APROBADA
  | 'terminal';

type ColumnLists = Record<ColumnKey, SolicitudItem[]>;

type ColumnConfig = KanbanColumnDef & {
  key: ColumnKey;
  status: RequestStatus;
  alsoIncludes?: RequestStatus[];
};

const columnLists = reactive<ColumnLists>({
  [RequestStatus.REGISTRADA]: [],
  [RequestStatus.EN_ANALISIS]: [],
  [RequestStatus.EN_REVISION_COORDINACION]: [],
  [RequestStatus.APROBADA]: [],
  terminal: [],
});

const showStatusDialog = ref(false);
const showChoiceDialog = ref(false);
const dialogComment = ref('');
const pendingTicket = ref<SolicitudItem | null>(null);
const pendingColumnKey = ref<string | null>(null);
const pendingTargetStatus = ref<RequestStatus | null>(null);
const statusChoices = ref<RequestStatus[]>([]);

const filteredTickets = computed(() => {
  return solicitudes.value.filter((t) => {
    if (selectedCategory.value && t.category !== selectedCategory.value) return false;
    if (!searchQuery.value.trim()) return true;
    const q = searchQuery.value.toLowerCase().trim();
    return (
      t.code.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.requesterName.toLowerCase().includes(q) ||
      (t.assignedAnalystName?.toLowerCase().includes(q) ?? false)
    );
  });
});

function ticketBelongsToColumn(ticket: SolicitudItem, col: ColumnConfig): boolean {
  if (ticket.status === col.status) return true;
  if (col.alsoIncludes?.includes(ticket.status)) return true;
  return false;
}

function rebuildColumns() {
  columns.forEach((col) => {
    columnLists[col.key] = filteredTickets.value.filter((t) => ticketBelongsToColumn(t, col));
  });
}

watch(filteredTickets, rebuildColumns, { immediate: true });

const dragEnabled = computed(() => !!authStore.user);

async function loadTickets() {
  loading.value = true;
  try {
    const res = await apiClient.get<any, any>('/solicitudes');
    solicitudes.value = res.data || res || [];
    rebuildColumns();
  } catch {
    solicitudes.value = [];
    rebuildColumns();
  } finally {
    loading.value = false;
  }
}

function getColumnConfig(key: string): ColumnConfig | undefined {
  return columns.find((c) => c.key === key);
}

function allowedTargets(ticket: SolicitudItem): RequestStatus[] {
  const role = authStore.user?.role;
  if (!role) return [];
  const matrix = ALLOWED_STATUS_TRANSITIONS[role];
  return matrix?.[ticket.status] || [];
}

function candidateStatuses(col: ColumnConfig, ticket: SolicitudItem): RequestStatus[] {
  const statuses = [col.status, ...(col.alsoIncludes || [])];
  const allowed = allowedTargets(ticket);
  return statuses.filter((s) => allowed.includes(s));
}

function revertBoard() {
  rebuildColumns();
}

async function applyStatusChange(
  ticket: SolicitudItem,
  target: RequestStatus,
  comment?: string,
) {
  statusUpdating.value = true;
  try {
    const res = await apiClient.patch<any, any>(`/solicitudes/${ticket.id}/status`, {
      status: target,
      comment: comment?.trim() || `Transición desde tablero Kanban a ${STATUS_LABELS[target]}`,
    });
    const updated: SolicitudItem = res.data || res;
    const idx = solicitudes.value.findIndex((s) => s.id === ticket.id);
    if (idx >= 0) {
      solicitudes.value[idx] = updated;
    } else {
      solicitudes.value.push(updated);
    }
    rebuildColumns();
    toast.add({
      severity: 'success',
      summary: 'Estado actualizado',
      detail: `${ticket.code} → ${STATUS_LABELS[target]}`,
      life: 3500,
    });
  } catch (err: any) {
    revertBoard();
    const detail =
      err.response?.data?.error?.message || err.message || 'Transición no permitida';
    toast.add({ severity: 'warn', summary: 'No se pudo mover la tarjeta', detail, life: 6000 });
  } finally {
    statusUpdating.value = false;
  }
}

function needsComment(status: RequestStatus): boolean {
  return status === RequestStatus.RECHAZADA || status === RequestStatus.CANCELADA;
}

function beginTransition(ticket: SolicitudItem, target: RequestStatus, columnKey: string) {
  pendingTicket.value = ticket;
  pendingTargetStatus.value = target;
  pendingColumnKey.value = columnKey;
  dialogComment.value = '';

  if (needsComment(target)) {
    showStatusDialog.value = true;
    return;
  }

  void applyStatusChange(ticket, target);
}

function confirmStatusDialog() {
  if (!pendingTicket.value || !pendingTargetStatus.value) return;
  if (needsComment(pendingTargetStatus.value) && !dialogComment.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Comentario requerido',
      detail: 'Indique el motivo del rechazo o cancelación.',
      life: 4000,
    });
    return;
  }
  showStatusDialog.value = false;
  void applyStatusChange(
    pendingTicket.value,
    pendingTargetStatus.value,
    dialogComment.value,
  );
}

function cancelStatusDialog() {
  showStatusDialog.value = false;
  showChoiceDialog.value = false;
  pendingTicket.value = null;
  pendingTargetStatus.value = null;
  pendingColumnKey.value = null;
  revertBoard();
}

function confirmChoice(status: RequestStatus) {
  showChoiceDialog.value = false;
  if (!pendingTicket.value) return;
  beginTransition(pendingTicket.value, status, pendingColumnKey.value || '');
}

function onCardAdded(payload: { ticket: SolicitudItem; columnKey: string }) {
  if (statusUpdating.value) return;

  const ticket = solicitudes.value.find((s) => s.id === payload.ticket.id) || payload.ticket;
  const col = getColumnConfig(payload.columnKey);
  if (!col) {
    revertBoard();
    return;
  }

  if (ticketBelongsToColumn(ticket, col)) {
    return;
  }

  const candidates = candidateStatuses(col, ticket);
  if (candidates.length === 0) {
    revertBoard();
    toast.add({
      severity: 'warn',
      summary: 'Movimiento no permitido',
      detail: 'Su rol no puede realizar esa transición.',
      life: 4500,
    });
    return;
  }

  if (candidates.length > 1) {
    pendingTicket.value = ticket;
    pendingColumnKey.value = payload.columnKey;
    statusChoices.value = candidates;
    showChoiceDialog.value = true;
    return;
  }

  beginTransition(ticket, candidates[0]!, payload.columnKey);
}

function goToDetail(id: string) {
  router.push(`/solicitudes/${id}`);
}

onMounted(() => {
  loadTickets();
});
</script>

<template>
  <AppLayout>
    <div class="kanban-view">
      <div class="kanban-header">
        <div>
          <div class="title-row">
            <font-awesome-icon icon="table-columns" class="title-icon" />
            <h1 class="view-title">Tablero Kanban de Solicitudes</h1>
          </div>
          <p class="view-subtitle">
            Arrastre las tarjetas entre columnas para actualizar el estado según su rol.
          </p>
        </div>
        <div class="header-actions">
          <router-link to="/solicitudes/nueva" class="btn-primary">
            <font-awesome-icon icon="plus" />
            <span>Nueva Solicitud</span>
          </router-link>
          <button class="btn-refresh" type="button" @click="loadTickets" title="Refrescar">
            <font-awesome-icon icon="rotate" :spin="loading" />
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <font-awesome-icon icon="magnifying-glass" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por código, título, analista o solicitante..."
            class="search-input"
          />
        </div>
        <select v-model="selectedCategory" class="filter-select">
          <option value="">Todas las Categorías</option>
          <option v-for="(label, val) in CATEGORY_LABELS" :key="val" :value="val">
            {{ label }}
          </option>
        </select>
      </div>

      <div class="kanban-board">
        <KanbanColumn
          v-for="col in columns"
          :key="col.key"
          v-model="columnLists[col.key]"
          :column="col"
          :loading="loading"
          :drag-enabled="dragEnabled && !statusUpdating"
          @open-ticket="goToDetail"
          @added="onCardAdded"
        />
      </div>
    </div>

    <Dialog
      v-model:visible="showChoiceDialog"
      header="Seleccionar estado de cierre"
      modal
      :style="{ width: '26rem' }"
      @hide="cancelStatusDialog"
    >
      <p class="dialog-hint">Esta columna admite más de un estado. Elija el destino:</p>
      <div class="choice-list">
        <Button
          v-for="choice in statusChoices"
          :key="choice"
          :label="STATUS_LABELS[choice]"
          severity="secondary"
          outlined
          class="choice-btn"
          @click="confirmChoice(choice)"
        />
      </div>
    </Dialog>

    <Dialog
      v-model:visible="showStatusDialog"
      header="Motivo del cambio de estado"
      modal
      :style="{ width: '28rem' }"
      @hide="cancelStatusDialog"
    >
      <p class="dialog-hint">
        {{
          pendingTargetStatus
            ? `Indique el motivo para pasar a «${STATUS_LABELS[pendingTargetStatus]}».`
            : 'Comentario obligatorio.'
        }}
      </p>
      <Textarea v-model="dialogComment" rows="4" class="w-full" auto-resize />
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="cancelStatusDialog" />
        <Button label="Confirmar" :loading="statusUpdating" @click="confirmStatusDialog" />
      </template>
    </Dialog>
  </AppLayout>
</template>

<style scoped>
.kanban-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  font-size: 1.5rem;
  color: var(--bnb-purple);
}

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.view-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0.2rem 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-primary {
  padding: 0.65rem 1.25rem;
  background: var(--bnb-green);
  color: #ffffff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-refresh {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input,
.filter-select {
  width: 100%;
  padding: 0.65rem 1rem 0.65rem 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
}

.filter-select {
  padding-left: 1rem;
  min-width: 220px;
  width: auto;
}

.kanban-board {
  display: flex;
  gap: 1rem;
  overflow-x: hidden;
  padding-bottom: 1.5rem;
  align-items: flex-start;
  max-width: 100%;
}

@media (max-width: 768px) {
  .kanban-board {
    flex-direction: column;
    align-items: stretch;
  }
}

.dialog-hint {
  margin: 0 0 1rem;
  color: #475569;
  font-size: 0.9rem;
}

.choice-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.choice-btn {
  justify-content: flex-start;
}

.w-full {
  width: 100%;
}
</style>
