<script setup lang="ts">
import { SolicitudItem, CATEGORY_LABELS } from '@bnb/shared';

defineProps<{
  ticket: SolicitudItem;
  draggable?: boolean;
}>();

const emit = defineEmits<{
  open: [id: string];
}>();

const priorityClass: Record<string, string> = {
  BAJA: 'pri-baja',
  MEDIA: 'pri-media',
  ALTA: 'pri-alta',
  URGENTE: 'pri-urgente',
};
</script>

<template>
  <article
    :class="['kanban-card', priorityClass[ticket.priority] || 'pri-media', { 'is-draggable': draggable }]"
    @click="emit('open', ticket.id)"
  >
    <div class="drag-handle" title="Arrastrar">
      <font-awesome-icon icon="grip-vertical" />
    </div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-code">{{ ticket.code }}</span>
        <span :class="['priority-pill', ticket.priority.toLowerCase()]">
          {{ ticket.priority }}
        </span>
      </div>
      <h4 class="card-title">{{ ticket.title }}</h4>
      <span class="category-tag">{{ CATEGORY_LABELS[ticket.category] }}</span>
      <div class="card-people">
        <div class="person-row" title="Solicitante">
          <span class="person-role">Sol:</span>
          <span class="person-name">{{ ticket.requesterName }}</span>
        </div>
        <div class="person-row" title="Encargado">
          <span class="person-role">Resp:</span>
          <span :class="['person-name', { unassigned: !ticket.assignedAnalystName }]">
            {{ ticket.assignedAnalystName || 'Sin asignar' }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.kanban-card {
  position: relative;
  display: flex;
  gap: 0.35rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.65rem 0.75rem 0.75rem 0.45rem;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
  border-left: 4px solid #94a3b8;
}

.kanban-card.is-draggable {
  cursor: grab;
}

.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
  border-color: #cbd5e1;
}

.kanban-card.pri-baja { border-left-color: #64748b; }
.kanban-card.pri-media { border-left-color: #3b82f6; }
.kanban-card.pri-alta { border-left-color: #f59e0b; }
.kanban-card.pri-urgente { border-left-color: #ef4444; }

.drag-handle {
  color: #cbd5e1;
  padding: 0.15rem 0.1rem;
  cursor: grab;
  align-self: stretch;
  display: flex;
  align-items: center;
}

.drag-handle:active {
  cursor: grabbing;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.card-code {
  font-weight: 800;
  font-size: 0.72rem;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
}

.priority-pill {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
}

.priority-pill.baja { background: #f1f5f9; color: #475569; }
.priority-pill.media { background: #dbeafe; color: #1d4ed8; }
.priority-pill.alta { background: #fef3c7; color: #b45309; }
.priority-pill.urgente { background: #fee2e2; color: #b91c1c; }

.card-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-tag {
  font-size: 0.68rem;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  align-self: flex-start;
}

.card-people {
  padding-top: 0.35rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.72rem;
}

.person-row {
  display: flex;
  gap: 0.3rem;
  min-width: 0;
}

.person-role {
  color: #94a3b8;
  font-weight: 700;
}

.person-name {
  color: #334155;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-name.unassigned {
  color: #d97706;
  font-style: italic;
}
</style>
