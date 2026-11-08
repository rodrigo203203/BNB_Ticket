<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="error-page">
    <div class="error-card">
      <font-awesome-icon icon="compass" class="error-icon" />
      <h1>404 - Página no encontrada</h1>
      <p>La ruta a la que intenta acceder no existe en la plataforma de la Gerencia de Datos.</p>
      <button class="btn-back" @click="router.push('/dashboard')">
        Regresar al Panel Principal
      </button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 1.5rem;
}

.error-card {
  max-width: 480px;
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.error-icon {
  font-size: 3.5rem;
  color: var(--bnb-purple);
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.5rem;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

p {
  color: #64748b;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.btn-back {
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
}
</style>
