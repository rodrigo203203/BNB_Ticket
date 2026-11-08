<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth.store';
import { ROLE_LABELS } from '@bnb/shared';
import { resolveAvatarSrc } from '../utils/avatar';

const authStore = useAuthStore();
const toast = useToast();

const fullName = ref('');
const jobTitle = ref('');
const area = ref('');
const savingProfile = ref(false);

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const changingPass = ref(false);

const avatarUploading = ref(false);
const avatarPreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const avatarBroken = ref(false);

const avatarSrc = computed(() => {
  if (avatarPreview.value) return avatarPreview.value;
  if (avatarBroken.value) return null;
  return resolveAvatarSrc(authStore.user);
});

const initials = computed(() =>
  authStore.user?.fullName ? authStore.user.fullName.charAt(0).toUpperCase() : 'U',
);

watch(
  () => authStore.user,
  (u) => {
    if (!u) return;
    fullName.value = u.fullName;
    jobTitle.value = u.jobTitle || '';
    area.value = u.area;
    avatarBroken.value = false;
  },
  { immediate: true },
);

function onAvatarError() {
  avatarBroken.value = true;
}

async function saveProfile() {
  if (!fullName.value.trim() || !area.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Campos incompletos',
      detail: 'Nombre y área son obligatorios.',
      life: 4000,
    });
    return;
  }

  savingProfile.value = true;
  try {
    await authStore.updateProfile({
      fullName: fullName.value.trim(),
      jobTitle: jobTitle.value.trim() || undefined,
      area: area.value.trim(),
    });
    toast.add({
      severity: 'success',
      summary: 'Perfil actualizado',
      detail: 'Sus datos institucionales fueron guardados.',
      life: 4000,
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error al guardar',
      detail: err.response?.data?.error?.message || err.message,
      life: 5000,
    });
  } finally {
    savingProfile.value = false;
  }
}

function openFilePicker() {
  fileInput.value?.click();
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  avatarPreview.value = URL.createObjectURL(file);
  avatarUploading.value = true;
  try {
    await authStore.uploadAvatar(file);
    toast.add({
      severity: 'success',
      summary: 'Foto actualizada',
      detail: 'Su foto de perfil se guardó correctamente.',
      life: 4000,
    });
  } catch (err: any) {
    avatarPreview.value = null;
    toast.add({
      severity: 'error',
      summary: 'No se pudo subir la imagen',
      detail: err.response?.data?.error?.message || err.message,
      life: 5000,
    });
  } finally {
    avatarUploading.value = false;
    input.value = '';
  }
}

async function removeAvatar() {
  avatarUploading.value = true;
  try {
    await authStore.deleteAvatar();
    avatarPreview.value = null;
    toast.add({
      severity: 'info',
      summary: 'Foto eliminada',
      detail: 'Se restableció el avatar con iniciales.',
      life: 4000,
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.error?.message || err.message,
      life: 5000,
    });
  } finally {
    avatarUploading.value = false;
  }
}

async function handleChangePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    toast.add({ severity: 'warn', summary: 'Complete todos los campos de contraseña', life: 4000 });
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.add({ severity: 'warn', summary: 'Las contraseñas no coinciden', life: 4000 });
    return;
  }
  if (newPassword.value.length < 8) {
    toast.add({ severity: 'warn', summary: 'Mínimo 8 caracteres', life: 4000 });
    return;
  }

  changingPass.value = true;
  try {
    const { apiClient } = await import('../api/client');
    await apiClient.patch('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    toast.add({
      severity: 'success',
      summary: 'Contraseña actualizada',
      detail: 'Cifrada con Argon2id según política BNB.',
      life: 5000,
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error de contraseña',
      detail: err.response?.data?.error?.message || err.message,
      life: 5000,
    });
  } finally {
    changingPass.value = false;
  }
}
</script>

<template>
  <AppLayout>
    <div class="profile-page">
      <section class="profile-hero">
        <div class="hero-content">
          <div class="avatar-wrap">
            <div class="avatar-ring">
              <img
                v-if="avatarSrc"
                :src="avatarSrc"
                alt="Foto de perfil"
                class="avatar-img"
                @error="onAvatarError"
              />
              <div v-else class="avatar-fallback">{{ initials }}</div>
              <button
                type="button"
                class="avatar-edit-btn"
                :disabled="avatarUploading"
                title="Cambiar foto"
                @click="openFilePicker"
              >
                <font-awesome-icon :icon="avatarUploading ? 'spinner' : 'camera'" :spin="avatarUploading" />
              </button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-input"
              @change="onFileSelected"
            />
          </div>
          <div class="hero-text">
            <h1>{{ authStore.user?.fullName }}</h1>
            <p class="hero-sub">
              {{ authStore.user?.jobTitle || 'Sin cargo registrado' }}
              <span v-if="authStore.user?.area"> · {{ authStore.user?.area }}</span>
            </p>
            <Tag
              v-if="authStore.user"
              :value="ROLE_LABELS[authStore.user.role]"
              :class="['role-tag', authStore.user.role.toLowerCase()]"
            />
          </div>
          <div v-if="authStore.user?.avatarUrl" class="hero-actions">
            <Button
              label="Quitar foto"
              severity="secondary"
              outlined
              size="small"
              :loading="avatarUploading"
              @click="removeAvatar"
            />
          </div>
        </div>
      </section>

      <div class="profile-grid">
        <section class="panel panel-form">
          <header class="panel-head">
            <font-awesome-icon icon="pen" class="panel-icon" />
            <div>
              <h2>Datos personales</h2>
              <p>Actualice su nombre, cargo y área asignada.</p>
            </div>
          </header>

          <form class="profile-fields" @submit.prevent="saveProfile">
            <label class="field">
              <span>Nombre completo</span>
              <InputText v-model="fullName" placeholder="Nombre y apellidos" fluid />
            </label>
            <label class="field">
              <span>Cargo</span>
              <InputText v-model="jobTitle" placeholder="Ej. Analista Senior de Datos" fluid />
            </label>
            <label class="field">
              <span>Área / Gerencia</span>
              <InputText v-model="area" placeholder="Gerencia o dirección" fluid />
            </label>
            <label class="field readonly">
              <span>Correo institucional</span>
              <InputText :model-value="authStore.user?.email" disabled fluid />
            </label>

            <Button
              type="submit"
              label="Guardar cambios"
              :loading="savingProfile"
              class="save-btn"
            />
          </form>

          <Divider />

          <div class="meta-grid">
            <div>
              <small>Estado</small>
              <strong class="text-ok"><font-awesome-icon icon="circle-check" /> Activa</strong>
            </div>
            <div>
              <small>Último acceso</small>
              <strong>{{
                authStore.user?.lastLoginAt
                  ? new Date(authStore.user.lastLoginAt).toLocaleString()
                  : 'Sesión actual'
              }}</strong>
            </div>
            <div>
              <small>Alta en plataforma</small>
              <strong>{{
                authStore.user?.createdAt
                  ? new Date(authStore.user.createdAt).toLocaleDateString()
                  : '—'
              }}</strong>
            </div>
          </div>

          <router-link to="/sessions" class="sessions-link">
            <font-awesome-icon icon="shield-halved" />
            Ver y administrar mis sesiones activas
          </router-link>
        </section>

        <section class="panel panel-security">
          <header class="panel-head">
            <font-awesome-icon icon="lock" class="panel-icon lock" />
            <div>
              <h2>Seguridad de acceso</h2>
              <p>Use contraseñas robustas en la red interna del BNB.</p>
            </div>
          </header>

          <form class="profile-fields" @submit.prevent="handleChangePassword">
            <label class="field">
              <span>Contraseña actual</span>
              <InputText v-model="currentPassword" type="password" fluid autocomplete="current-password" />
            </label>
            <label class="field">
              <span>Nueva contraseña</span>
              <InputText v-model="newPassword" type="password" fluid autocomplete="new-password" />
            </label>
            <label class="field">
              <span>Confirmar nueva contraseña</span>
              <InputText v-model="confirmPassword" type="password" fluid autocomplete="new-password" />
            </label>
            <Button type="submit" label="Actualizar contraseña" :loading="changingPass" severity="help" />
          </form>
        </section>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-hero {
  border-radius: 16px;
  padding: 2rem;
  background: linear-gradient(135deg, #26b460 0%, #1f9750 45%, #5b21b6 100%);
  color: #fff;
  box-shadow: 0 12px 32px rgba(91, 33, 182, 0.25);
}

.hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
}

.avatar-wrap {
  flex-shrink: 0;
}

.avatar-ring {
  position: relative;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  padding: 4px;
  background: rgba(255, 255, 255, 0.35);
}

.avatar-img,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4c1d95;
  font-size: 2.5rem;
  font-weight: 800;
}

.avatar-edit-btn :deep(svg) {
  width: 0.95rem;
  height: 0.95rem;
}

.panel-head :deep(svg),
.sessions-link :deep(svg) {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.avatar-edit-btn {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #0f172a;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-edit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.hidden-input {
  display: none;
}

.hero-text h1 {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
}

.hero-sub {
  margin: 0.35rem 0 0.65rem;
  opacity: 0.92;
  font-size: 0.95rem;
}

.role-tag {
  font-weight: 700;
}

.hero-actions {
  margin-left: auto;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.25rem;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.5rem 1.75rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.panel-head {
  display: flex;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.panel-head h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.panel-head p {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.panel-icon {
  color: var(--bnb-green);
  font-size: 1.25rem;
  margin-top: 0.15rem;
}

.panel-icon.lock {
  color: var(--bnb-purple);
}

.profile-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.save-btn {
  margin-top: 0.25rem;
  align-self: flex-start;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  font-size: 0.82rem;
}

.meta-grid small {
  display: block;
  color: #94a3b8;
  margin-bottom: 0.2rem;
}

.text-ok {
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.sessions-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-weight: 600;
  font-size: 0.88rem;
  text-decoration: none;
}

.sessions-link:hover {
  color: var(--bnb-purple);
  border-color: #cbd5e1;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-hero {
    padding: 1.15rem 1rem;
    border-radius: 12px;
  }

  .hero-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  .avatar-ring {
    width: 88px;
    height: 88px;
  }

  .avatar-fallback {
    font-size: 2rem;
  }

  .hero-text h1 {
    font-size: 1.2rem;
    line-height: 1.3;
  }

  .hero-sub {
    font-size: 0.82rem;
  }

  .hero-actions {
    margin-left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .panel {
    padding: 1.1rem 1rem;
  }

  .panel-head {
    align-items: flex-start;
  }
}
</style>
