<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import { RequestCategory, RequestPriority, CATEGORY_LABELS } from '@bnb/shared';

const router = useRouter();

const title = ref('');
const category = ref<RequestCategory>(RequestCategory.EXTRACCION_DATOS);
const priority = ref<RequestPriority>(RequestPriority.MEDIA);
const justification = ref('');
const description = ref('');
const submitting = ref(false);
const errorMessage = ref('');

const categories = [
  { value: RequestCategory.EXTRACCION_DATOS, label: CATEGORY_LABELS[RequestCategory.EXTRACCION_DATOS] },
  { value: RequestCategory.REPORTES_BI, label: CATEGORY_LABELS[RequestCategory.REPORTES_BI] },
  { value: RequestCategory.MODELOS_ML, label: CATEGORY_LABELS[RequestCategory.MODELOS_ML] },
  { value: RequestCategory.CALIDAD_DATOS, label: CATEGORY_LABELS[RequestCategory.CALIDAD_DATOS] },
  { value: RequestCategory.GOBIERNO_DATOS, label: CATEGORY_LABELS[RequestCategory.GOBIERNO_DATOS] },
  { value: RequestCategory.ACCESO_BD, label: CATEGORY_LABELS[RequestCategory.ACCESO_BD] },
];

const priorities = [
  { value: RequestPriority.BAJA, label: 'Baja' },
  { value: RequestPriority.MEDIA, label: 'Media (Estándar)' },
  { value: RequestPriority.ALTA, label: 'Alta' },
  { value: RequestPriority.URGENTE, label: 'Urgente (Comité / Auditoría)' },
];

async function handleSubmit() {
  if (!title.value.trim() || !description.value.trim()) {
    errorMessage.value = 'Por favor complete el título y la descripción detallada del requerimiento.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    const res = await apiClient.post<any, any>('/solicitudes', {
      title: title.value.trim(),
      description: description.value.trim(),
      category: category.value,
      priority: priority.value,
      justification: justification.value.trim() || undefined,
    });

    const newId = res.data?.id || res.id;
    if (newId) {
      router.push(`/solicitudes/${newId}`);
    } else {
      router.push('/solicitudes');
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'Error al registrar la solicitud';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <div class="breadcrumb-nav">
        <router-link to="/solicitudes" class="back-link">
          <font-awesome-icon icon="arrow-left" />
          <span>Volver a Solicitudes</span>
        </router-link>
      </div>

      <div class="header-card">
        <div class="header-icon-box">
          <font-awesome-icon icon="plus" />
        </div>
        <div>
          <h1 class="header-title">Registrar Nueva Solicitud</h1>
          <p class="header-subtitle">
            Ingreso formal de requerimientos analíticos, extracción o proyectos de datos a la Gerencia de Datos BNB.
          </p>
        </div>
      </div>

      <div v-if="errorMessage" class="error-banner">
        <font-awesome-icon icon="circle-exclamation" />
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="form-card">
        <div class="form-row">
          <div class="form-group flex-2">
            <label for="title">Título del Requerimiento <span class="required">*</span></label>
            <input
              id="title"
              v-model="title"
              type="text"
              class="form-control"
              placeholder="Ej. Extracción de cartera PyME morosa para auditoría ASFI"
              required
            />
            <small class="help-text">Indica un título claro y representativo de la necesidad.</small>
          </div>

          <div class="form-group flex-1">
            <label for="priority">Prioridad Estimada <span class="required">*</span></label>
            <select id="priority" v-model="priority" class="form-control" required>
              <option v-for="p in priorities" :key="p.value" :value="p.value">
                {{ p.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="category">Categoría de Datos <span class="required">*</span></label>
            <select id="category" v-model="category" class="form-control" required>
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
            <small class="help-text">Selecciona el tipo de trabajo requerido por tu área.</small>
          </div>

          <div class="form-group flex-1">
            <label for="justification">Justificación de Negocio / ASFI</label>
            <input
              id="justification"
              v-model="justification"
              type="text"
              class="form-control"
              placeholder="Ej. Requerido para Comité de Riesgos mensual y reporte regulatorio"
            />
            <small class="help-text">Opcional: motivo regulatorio, gerencial o normativo.</small>
          </div>
        </div>

        <div class="form-group">
          <label for="description">Descripción Detallada y Alcance <span class="required">*</span></label>
          <textarea
            id="description"
            v-model="description"
            rows="6"
            class="form-control"
            placeholder="Detalla las variables necesarias, período de análisis, filtros aplicables, formato de entrega esperado..."
            required
          ></textarea>
          <small class="help-text">Sé lo más específico posible para facilitar el análisis del equipo técnico.</small>
        </div>

        <div class="form-actions">
          <router-link to="/solicitudes" class="btn-secondary">Cancelar</router-link>
          <button type="submit" class="btn-primary" :disabled="submitting">
            <font-awesome-icon v-if="submitting" icon="spinner" spin />
            <font-awesome-icon v-else icon="check" />
            <span>{{ submitting ? 'Registrando en base de datos...' : 'Enviar Solicitud' }}</span>
          </button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.breadcrumb-nav {
  margin-bottom: 1rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--bnb-purple);
}

.header-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background: #ffffff;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.header-icon-box {
  width: 50px;
  height: 50px;
  background: var(--bnb-green-light);
  color: var(--bnb-green);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}

.header-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.header-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.85rem 1.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.form-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1.5rem;
}

.flex-1 {
  flex: 1;
}

.flex-2 {
  flex: 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.required {
  color: #dc2626;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1e293b;
  background-color: #ffffff;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
}

.form-control:focus {
  border-color: var(--bnb-green);
  box-shadow: 0 0 0 3px rgba(38, 180, 96, 0.15);
}

textarea.form-control {
  resize: vertical;
}

.help-text {
  font-size: 0.78rem;
  color: #94a3b8;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
  margin-top: 0.5rem;
}

.btn-secondary {
  padding: 0.75rem 1.25rem;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--bnb-green);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--bnb-green-hover);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: 1.5rem;
  }
}
</style>

