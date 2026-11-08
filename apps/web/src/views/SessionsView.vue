<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { UserSession } from '@bnb/shared';

const sessions = ref<UserSession[]>([]);
const loading = ref(false);
const actionMessage = ref<string | null>(null);

async function loadSessions() {
  loading.value = true;
  actionMessage.value = null;
  try {
    const res = await apiClient.get<any, { success: boolean; data: UserSession[] }>('/sessions/me');
    sessions.value = res.data || (res as any) || [];
  } catch {
    sessions.value = [];
  } finally {
    loading.value = false;
  }
}

async function revokeSession(id: string) {
  try {
    await apiClient.delete(`/sessions/${id}`);
    actionMessage.value = 'Sesión revocada exitosamente';
    await loadSessions();
  } catch (err: any) {
    actionMessage.value = err.response?.data?.error?.message || 'Error al revocar la sesión';
  }
}

async function revokeOtherSessions() {
  try {
    await apiClient.delete('/sessions/me/others');
    actionMessage.value = 'Todas las demás sesiones han sido revocadas';
    await loadSessions();
  } catch (err: any) {
    actionMessage.value = err.response?.data?.error?.message || 'Error al revocar sesiones';
  }
}

onMounted(() => {
  loadSessions();
});
</script>

<template>
  <AppLayout>
    <div class="view-header">
      <div>
        <h1 class="view-title">Control de Sesiones Activas</h1>
        <p class="view-subtitle">Monitoreo y revocación de accesos activos (Seguridad OWASP / HttpOnly)</p>
      </div>
      <button class="btn-danger-outline" @click="revokeOtherSessions" :disabled="sessions.length <= 1">
        <font-awesome-icon icon="ban" />
        <span>Cerrar Todas las Demás Sesiones</span>
      </button>
    </div>

    <div v-if="actionMessage" class="status-alert">
      {{ actionMessage }}
    </div>

    <div class="sessions-grid">
      <div v-for="s in sessions" :key="s.id" :class="['session-card', { current: s.isCurrent }]">
        <div class="session-card-header">
          <div class="device-type">
            <font-awesome-icon :icon="s.isCurrent ? 'laptop' : 'display'" class="device-icon" />
            <div>
              <strong>{{ s.deviceInfo || 'Dispositivo Web' }}</strong>
              <span v-if="s.isCurrent" class="current-badge">Sesión Actual</span>
            </div>
          </div>
          <button
            v-if="!s.isCurrent"
            class="revoke-btn"
            @click="revokeSession(s.id)"
            title="Revocar sesión"
          >
            Revocar
          </button>
        </div>

        <div class="session-card-details">
          <div class="detail-row">
            <span>Dirección IP:</span>
            <code>{{ s.ipAddress || '127.0.0.1' }}</code>
          </div>
          <div class="detail-row">
            <span>Última Actividad:</span>
            <span>{{ new Date(s.lastActivityAt).toLocaleString() }}</span>
          </div>
          <div class="detail-row">
            <span>Inició el:</span>
            <span>{{ new Date(s.createdAt).toLocaleString() }}</span>
          </div>
          <div class="detail-row">
            <span>Expira:</span>
            <span>{{ new Date(s.expiresAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
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

.btn-danger-outline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #f87171;
  color: #dc2626;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-danger-outline:hover:not(:disabled) {
  background: #fee2e2;
}

.btn-danger-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-alert {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .sessions-grid {
    grid-template-columns: 1fr;
  }
}

.session-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.session-card.current {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 1px var(--bnb-green);
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.device-type {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.device-icon {
  font-size: 1.5rem;
  color: var(--bnb-purple);
}

.current-badge {
  display: inline-block;
  margin-left: 0.5rem;
  background: var(--bnb-green-light);
  color: var(--bnb-green);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.revoke-btn {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.revoke-btn:hover {
  background: #ef4444;
  color: #ffffff;
}

.session-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #64748b;
  border-top: 1px solid #f1f5f9;
  padding-top: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
}

.detail-row code {
  font-family: monospace;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  color: #1e293b;
}
</style>
