<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus';
import { SolicitudItem } from '@bnb/shared';
import KanbanCard from './KanbanCard.vue';

export type KanbanColumnDef = {
  key: string;
  label: string;
  sub: string;
  icon: string;
  badgeClass: string;
};

const tickets = defineModel<SolicitudItem[]>({ required: true });

const props = defineProps<{
  column: KanbanColumnDef;
  loading?: boolean;
  dragEnabled?: boolean;
  dropHighlight?: boolean;
}>();

const emit = defineEmits<{
  openTicket: [id: string];
  added: [payload: { ticket: SolicitudItem; columnKey: string }];
}>();
</script>

<template>
  <div :class="['kanban-column', column.badgeClass, { 'drop-active': dropHighlight }]">
    <header class="column-header">
      <div class="col-title-group">
        <font-awesome-icon :icon="column.icon" />
        <div>
          <span class="col-name">{{ column.label }}</span>
          <small class="col-sub">{{ column.sub }}</small>
        </div>
      </div>
      <span class="col-count">{{ tickets.length }}</span>
    </header>

    <div class="column-body">
      <div v-if="loading && tickets.length === 0" class="col-loading">
        <font-awesome-icon icon="spinner" spin />
      </div>

      <VueDraggable
        v-else
        v-model="tickets"
        :group="{ name: 'kanban', pull: dragEnabled, put: dragEnabled }"
        :disabled="!dragEnabled"
        item-key="id"
        class="column-cards"
        ghost-class="kanban-ghost"
        chosen-class="kanban-chosen"
        handle=".drag-handle"
        @change="(evt: any) => {
          const added = evt?.added?.element;
          if (added) {
            emit('added', { ticket: added as SolicitudItem, columnKey: props.column.key });
          }
        }"
      >
        <KanbanCard
          v-for="ticket in tickets"
          :key="ticket.id"
          :ticket="ticket"
          :draggable="dragEnabled"
          @open="emit('openTicket', $event)"
        />
        <div v-if="tickets.length === 0" class="empty-column">
          <font-awesome-icon :icon="column.icon" />
          <span>Sin solicitudes</span>
        </div>
      </VueDraggable>
    </div>
  </div>
</template>

<style scoped>
.kanban-column {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  min-width: 270px;
  flex: 1 1 270px;
  max-width: 100%;
  transition: box-shadow 0.2s, border-color 0.2s;
}

@media (max-width: 768px) {
  .kanban-column {
    min-width: 0;
    width: 100%;
    min-height: auto;
  }
}

.kanban-column.drop-active {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 3px rgba(38, 180, 96, 0.2);
}

.column-header {
  padding: 1rem;
  border-top-left-radius: 11px;
  border-top-right-radius: 11px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.col-title-group {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.col-name {
  display: block;
  font-weight: 800;
  font-size: 0.9rem;
}

.col-sub {
  display: block;
  font-size: 0.72rem;
  opacity: 0.85;
  margin-top: 0.1rem;
}

.col-count {
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-weight: 800;
  min-width: 1.5rem;
  text-align: center;
}

.col-blue { background: linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%); color: #0369a1; }
.col-amber { background: linear-gradient(180deg, #fef3c7 0%, #fffbeb 100%); color: #b45309; }
.col-purple { background: linear-gradient(180deg, #f3e8ff 0%, #faf5ff 100%); color: #7e22ce; }
.col-green { background: linear-gradient(180deg, #dcfce7 0%, #f0fdf4 100%); color: #15803d; }
.col-red { background: linear-gradient(180deg, #fee2e2 0%, #fef2f2 100%); color: #b91c1c; }

.column-body {
  flex: 1;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
}

.column-cards {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 120px;
  flex: 1;
}

.empty-column {
  color: #94a3b8;
  font-size: 0.8rem;
  text-align: center;
  padding: 2rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.col-loading {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

:global(.kanban-ghost) {
  opacity: 0.45;
  background: #ecfdf5;
  border: 2px dashed var(--bnb-green);
}

:global(.kanban-chosen) {
  cursor: grabbing !important;
}
</style>
