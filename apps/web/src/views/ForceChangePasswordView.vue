<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { apiClient } from '../api/client';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);

async function submit() {
  if (!currentPassword.value || !newPassword.value || newPassword.value !== confirmPassword.value) {
    toast.add({ severity: 'warn', summary: 'Validación', detail: 'Revise las contraseñas.', life: 4000 });
    return;
  }
  loading.value = true;
  try {
    await apiClient.patch('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    await authStore.fetchMe();
    toast.add({ severity: 'success', summary: 'Listo', detail: 'Contraseña actualizada.', life: 4000 });
    router.replace('/dashboard');
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || 'No se pudo cambiar la contraseña';
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
  } finally {
    loading.value = false;
  }
}

async function salir() {
  await authStore.logout();
  router.replace('/login');
}
</script>

<template>
  <div class="force-pwd-page">
    <div class="card">
      <h1>Cambio de contraseña obligatorio</h1>
      <p>Por seguridad debe establecer una contraseña personal antes de usar la plataforma.</p>
      <form class="form" @submit.prevent="submit">
        <label>Contraseña actual (entregada por el administrador)</label>
        <InputText v-model="currentPassword" type="password" fluid autocomplete="current-password" />
        <label>Nueva contraseña</label>
        <InputText v-model="newPassword" type="password" fluid autocomplete="new-password" />
        <label>Confirmar nueva contraseña</label>
        <InputText v-model="confirmPassword" type="password" fluid autocomplete="new-password" />
        <div class="actions">
          <Button type="submit" label="Guardar y continuar" :loading="loading" />
          <Button type="button" label="Cerrar sesión" severity="secondary" outlined @click="salir" />
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.force-pwd-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bnb-gray-50);
}
.card {
  max-width: 420px;
  width: 100%;
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
}
h1 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>