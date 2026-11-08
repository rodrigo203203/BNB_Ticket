<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { UserSummary, Role, ROLE_LABELS } from '@bnb/shared';

const users = ref<UserSummary[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedRole = ref<string>('');

// Modal Crear Usuario
const showCreateModal = ref(false);
const newEmail = ref('');
const newFullName = ref('');
const newPassword = ref('');
const newRole = ref<Role>(Role.ANALISTA);
const newArea = ref('');
const creating = ref(false);
const modalError = ref('');

const rolesList = [
  { value: Role.SOLICITANTE, label: ROLE_LABELS[Role.SOLICITANTE] },
  { value: Role.ANALISTA, label: ROLE_LABELS[Role.ANALISTA] },
  { value: Role.COORDINADOR, label: ROLE_LABELS[Role.COORDINADOR] },
  { value: Role.ADMINISTRADOR, label: ROLE_LABELS[Role.ADMINISTRADOR] },
];

async function loadUsers() {
  loading.value = true;
  try {
    const res = await apiClient.get<any, any>('/users', {
      params: {
        search: searchQuery.value || undefined,
        role: selectedRole.value || undefined,
      },
    });
    users.value = res.data || res || [];
  } catch (err: any) {
    users.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  newEmail.value = '';
  newFullName.value = '';
  newPassword.value = 'Password123!';
  newRole.value = Role.ANALISTA;
  newArea.value = 'Ingeniería de Datos';
  modalError.value = '';
  showCreateModal.value = true;
}

async function handleCreateUser() {
  if (!newEmail.value.trim() || !newFullName.value.trim() || !newPassword.value || !newArea.value.trim()) {
    modalError.value = 'Por favor complete todos los campos obligatorios.';
    return;
  }

  creating.value = true;
  modalError.value = '';

  try {
    await apiClient.post<any, any>('/users', {
      email: newEmail.value.trim().toLowerCase(),
      fullName: newFullName.value.trim(),
      password: newPassword.value,
      role: newRole.value,
      area: newArea.value.trim(),
    });

    showCreateModal.value = false;
    await loadUsers();
  } catch (err: any) {
    modalError.value = err.response?.data?.message || err.message || 'Error al crear usuario';
  } finally {
    creating.value = false;
  }
}

async function toggleUserActive(user: UserSummary) {
  const confirmMsg = user.isActive
    ? `¿Estás seguro de desactivar la cuenta de ${user.fullName}? No podrá iniciar sesión.`
    : `¿Deseas activar la cuenta de ${user.fullName}?`;

  if (!confirm(confirmMsg)) return;

  try {
    await apiClient.patch<any, any>(`/users/${user.id}/status`, {
      isActive: !user.isActive,
    });
    await loadUsers();
  } catch (err: any) {
    alert('Error: ' + (err.response?.data?.message || err.message));
  }
}

async function unlockUser(user: UserSummary) {
  if (!confirm(`¿Deseas desbloquear la cuenta de ${user.fullName} y reiniciar sus intentos fallidos?`)) return;

  try {
    await apiClient.patch<any, any>(`/users/${user.id}/status`, {
      isLocked: false,
    });
    await loadUsers();
  } catch (err: any) {
    alert('Error: ' + (err.response?.data?.message || err.message));
  }
}

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    if (selectedRole.value && u.role !== selectedRole.value) return false;
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchArea = u.area.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchArea) return false;
    }
    return true;
  });
});

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <AppLayout>
    <div class="users-view">
      <!-- Encabezado -->
      <div class="view-header">
        <div>
          <div class="title-row">
            <font-awesome-icon icon="users" class="title-icon" />
            <h1 class="view-title">Administración de Usuarios</h1>
          </div>
          <p class="view-subtitle">
            Gestión corporativa de identidades, roles bancarios y desbloqueo de seguridad (Argon2id)
          </p>
        </div>

        <button class="btn-primary" @click="openCreateModal">
          <font-awesome-icon icon="plus" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <div class="search-box">
          <font-awesome-icon icon="magnifying-glass" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, correo o área..."
            class="search-input"
          />
        </div>

        <select v-model="selectedRole" class="filter-select">
          <option value="">Todos los Roles</option>
          <option v-for="r in rolesList" :key="r.value" :value="r.value">
            {{ r.label }}
          </option>
        </select>
      </div>

      <!-- Tabla de Usuarios -->
      <div class="table-card">
        <table class="data-table data-table--cards">
          <thead>
            <tr>
              <th>Usuario / Nombre</th>
              <th class="hide-mobile">Correo Institucional</th>
              <th>Rol en Plataforma</th>
              <th class="hide-mobile">Área / Gerencia</th>
              <th>Estado Cuenta</th>
              <th class="hide-mobile">Seguridad</th>
              <th class="hide-mobile">Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filteredUsers" :key="u.id">
              <td data-label="Usuario">
                <div class="user-cell">
                  <div class="user-avatar-small">{{ u.fullName.charAt(0) }}</div>
                  <strong>{{ u.fullName }}</strong>
                </div>
              </td>
              <td class="hide-mobile" data-label="Correo"><span class="email-text">{{ u.email }}</span></td>
              <td data-label="Rol">
                <span :class="['role-badge', u.role.toLowerCase()]">
                  {{ ROLE_LABELS[u.role] }}
                </span>
              </td>
              <td class="hide-mobile" data-label="Área">{{ u.area }}</td>
              <td data-label="Estado">
                <span :class="['status-pill', u.isActive ? 'active' : 'inactive']">
                  {{ u.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="hide-mobile" data-label="Seguridad">
                <span v-if="u.isLocked" class="status-pill locked" title="Bloqueado por 5 intentos fallidos">
                  <font-awesome-icon icon="user-lock" /> Bloqueado
                </span>
                <span v-else class="status-pill normal">
                  Normal
                </span>
              </td>
              <td class="hide-mobile" data-label="Último acceso">
                {{ u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Sin accesos' }}
              </td>
              <td data-label="Acciones">
                <div class="action-buttons">
                  <button
                    v-if="u.isLocked"
                    class="btn-sm btn-unlock"
                    @click="unlockUser(u)"
                    title="Desbloquear cuenta de usuario"
                  >
                    Desbloquear
                  </button>
                  <button
                    class="btn-sm"
                    :class="u.isActive ? 'btn-deactivate' : 'btn-activate'"
                    @click="toggleUserActive(u)"
                  >
                    {{ u.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="loading">
              <td colspan="8" class="center-cell">Cargando directorio de usuarios...</td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="8" class="center-cell">No se encontraron usuarios coincidentes.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Crear Usuario -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title">Crear Nuevo Usuario</h2>
          <button class="modal-close" @click="showCreateModal = false">✕</button>
        </div>
        <form @submit.prevent="handleCreateUser" class="modal-body">
          <div v-if="modalError" class="modal-error">
            <font-awesome-icon icon="circle-exclamation" />
            <span>{{ modalError }}</span>
          </div>

          <div class="form-group">
            <label for="createName">Nombre Completo <span class="required">*</span></label>
            <input
              id="createName"
              v-model="newFullName"
              type="text"
              class="form-control"
              placeholder="Ej. Juan Pérez Rodríguez"
              required
            />
          </div>

          <div class="form-group">
            <label for="createEmail">Correo Institucional BNB <span class="required">*</span></label>
            <input
              id="createEmail"
              v-model="newEmail"
              type="email"
              class="form-control"
              placeholder="ejemplo@bnb.com.bo"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="createRole">Rol del Sistema <span class="required">*</span></label>
              <select id="createRole" v-model="newRole" class="form-control" required>
                <option v-for="r in rolesList" :key="r.value" :value="r.value">
                  {{ r.label }}
                </option>
              </select>
            </div>

            <div class="form-group flex-1">
              <label for="createArea">Área / Gerencia <span class="required">*</span></label>
              <input
                id="createArea"
                v-model="newArea"
                type="text"
                class="form-control"
                placeholder="Ej. Finanzas y Riesgos"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="createPass">Contraseña Inicial <span class="required">*</span></label>
            <input
              id="createPass"
              v-model="newPassword"
              type="text"
              class="form-control"
              placeholder="Mínimo 8 caracteres"
              required
            />
            <small class="help-text">Se almacenará mediante hash criptográfico Argon2id seguro.</small>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="creating">
              <font-awesome-icon v-if="creating" icon="spinner" spin />
              <font-awesome-icon v-else icon="check" />
              <span>{{ creating ? 'Guardando...' : 'Crear Usuario' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.users-view {
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

.btn-primary {
  padding: 0.7rem 1.4rem;
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--bnb-green-hover);
}

.btn-secondary {
  padding: 0.7rem 1.25rem;
  background: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
}

.filters-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

.search-input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
}

.search-input:focus {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 3px rgba(38, 180, 96, 0.15);
}

.filter-select {
  padding: 0.7rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #ffffff;
  outline: none;
  min-width: 200px;
}

.table-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 0.9rem;
  vertical-align: middle;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  background: var(--bnb-purple);
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.email-text {
  color: #64748b;
  font-family: monospace;
  font-size: 0.88rem;
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  display: inline-block;
}

.role-badge.administrador { background: #fee2e2; color: #b91c1c; }
.role-badge.coordinador { background: #f3e8ff; color: #7e22ce; }
.role-badge.analista { background: #e0f2fe; color: #0369a1; }
.role-badge.solicitante { background: #dcfce7; color: #15803d; }

.status-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
}

.status-pill.active { background: #dcfce7; color: #16a34a; }
.status-pill.inactive { background: #f1f5f9; color: #64748b; }
.status-pill.locked { background: #fee2e2; color: #dc2626; }
.status-pill.normal { background: #f8fafc; color: #475569; }

.action-buttons {
  display: flex;
  gap: 0.4rem;
}

.btn-sm {
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-deactivate {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-deactivate:hover {
  background: #fee2e2;
}

.btn-activate {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}

.btn-activate:hover {
  background: #dcfce7;
}

.btn-unlock {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.center-cell {
  text-align: center;
  padding: 3rem 1rem !important;
  color: #94a3b8;
}

/* Modal */
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
  gap: 1.15rem;
}

.modal-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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

.help-text {
  font-size: 0.75rem;
  color: #94a3b8;
}

.modal-footer {
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>

