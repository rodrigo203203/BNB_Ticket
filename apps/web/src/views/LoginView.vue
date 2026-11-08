<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

async function handleSubmit() {
  if (!email.value || !password.value) return;

  const success = await authStore.login(email.value, password.value);
  if (success) {
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="brand-section">
        <div class="brand-logo">BNB</div>
        <h1 class="portal-title">Gerencia de Datos</h1>
        <p class="portal-subtitle">Plataforma de Gestión de Solicitudes y Analítica</p>
      </div>

      <div v-if="authStore.errorMessage" class="error-banner">
        <font-awesome-icon icon="circle-exclamation" />
        <span>{{ authStore.errorMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">Correo Institucional</label>
          <div class="input-container">
            <font-awesome-icon icon="envelope" class="input-icon" />
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="usuario@bnb.com.bo"
              required
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="input-container">
            <font-awesome-icon icon="lock" class="input-icon" />
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="submit-button"
          :disabled="authStore.loading"
        >
          <span v-if="!authStore.loading">Iniciar Sesión</span>
          <span v-else>Verificando credenciales...</span>
        </button>
      </form>

      <div class="login-footer">
        <small>Seguridad de nivel bancario: Argon2id, CSRF y Sesiones Revocables</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #2e1065 100%);
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 2.5rem 2rem;
}

.brand-section {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-logo {
  display: inline-block;
  background: var(--bnb-green);
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 800;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.portal-title {
  color: var(--bnb-purple);
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.portal-subtitle {
  color: #64748b;
  font-size: 0.88rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: #94a3b8;
  font-size: 0.95rem;
}

.input-container input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.input-container input:focus {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 3px rgba(38, 180, 96, 0.15);
}

.password-toggle {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.submit-button {
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.85rem;
  font-weight: 600;
  font-size: 1rem;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  background: var(--bnb-green-hover);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.75rem;
}
</style>
