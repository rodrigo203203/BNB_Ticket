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
const mostrarClave = ref(false);

const requisitos =
  'Mínimo 10 caracteres, al menos una mayúscula, una minúscula y un número.';

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
    <div class="brand">BNB · Gerencia de Datos</div>
    <div class="card">
      <h1>Cambio de contraseña obligatorio</h1>
      <p>Por seguridad debe establecer una contraseña personal antes de usar la plataforma.</p>
      <p class="req-hint">{{ requisitos }}</p>
      <form class="form" @submit.prevent="submit">
        <label>Contraseña actual (entregada por el administrador)</label>
        <InputText
          v-model="currentPassword"
          :type="mostrarClave ? 'text' : 'password'"
          fluid
          autocomplete="current-password"
        />
        <label>Nueva contraseña</label>
        <InputText
          v-model="newPassword"
          :type="mostrarClave ? 'text' : 'password'"
          fluid
          autocomplete="new-password"
        />
        <label>Confirmar nueva contraseña</label>
        <InputText
          v-model="confirmPassword"
          :type="mostrarClave ? 'text' : 'password'"
          fluid
          autocomplete="new-password"
        />
        <button type="button" class="toggle-pwd" @click="mostrarClave = !mostrarClave">
          {{ mostrarClave ? 'Ocultar contraseñas' : 'Mostrar contraseñas' }}
        </button>
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bnb-gray-50);
  gap: 1rem;
}
.brand {
  font-weight: 700;
  color: var(--bnb-green, #26b460);
  letter-spacing: 0.02em;
}
.card {
  max-width: 420px;
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
}
.req-hint {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0 0 1rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.toggle-pwd {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--bnb-green, #26b460);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>