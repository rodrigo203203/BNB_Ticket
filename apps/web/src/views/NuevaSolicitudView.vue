<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import DatePicker from 'primevue/datepicker';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import AppLayout from '../layouts/AppLayout.vue';
import { apiClient } from '../api/client';
import {
  RequestCategory,
  RequestPriority,
  CATEGORY_LABELS,
  fechaCalendarioToIso,
  esFechaRequeridaPosteriorAHoy,
  ADJUNTO_EXTENSIONES_PERMITIDAS,
  ADJUNTO_MAX_BYTES,
  ADJUNTO_MAX_POR_SOLICITUD,
} from '@bnb/shared';

const router = useRouter();

const title = ref('');
const category = ref<RequestCategory>(RequestCategory.EXTRACCION_DATOS);
const priority = ref<RequestPriority>(RequestPriority.MEDIA);
const justification = ref('');
const description = ref('');
const fechaRequerida = ref<Date | null>(null);
const camposRequeridos = ref('');
const submitting = ref(false);
const errorMessage = ref('');
const archivosPendientes = ref<File[]>([]);
const fileInputNueva = ref<HTMLInputElement | null>(null);

const acceptAdjuntos = ADJUNTO_EXTENSIONES_PERMITIDAS.map((e) => `.${e}`).join(',');

function onSeleccionArchivos(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const nuevos = input.files ? Array.from(input.files) : [];
  input.value = '';
  for (const f of nuevos) {
    if (archivosPendientes.value.length >= ADJUNTO_MAX_POR_SOLICITUD) break;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!ADJUNTO_EXTENSIONES_PERMITIDAS.includes(ext as (typeof ADJUNTO_EXTENSIONES_PERMITIDAS)[number])) {
      errorMessage.value = 'Formato no permitido. Use PDF, XLSX, CSV o DOCX.';
      continue;
    }
    if (f.size > ADJUNTO_MAX_BYTES) {
      errorMessage.value = 'Cada adjunto no puede superar 10 MB.';
      continue;
    }
    archivosPendientes.value.push(f);
  }
}

function quitarPendiente(index: number) {
  archivosPendientes.value.splice(index, 1);
}

async function subirAdjuntosTrasCrear(solicitudId: string) {
  for (const file of archivosPendientes.value) {
    const form = new FormData();
    form.append('file', file);
    await apiClient.post(`/solicitudes/${solicitudId}/adjuntos`, form);
  }
}

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

/** Primer día seleccionable: mañana en calendario local del navegador (la API valida America/La_Paz). */
const minFechaRequerida = computed(() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
});

function formatearFechaLarga(isoOrDate: Date): string {
  return isoOrDate.toLocaleDateString('es-BO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function handleSubmit() {
  if (!title.value.trim() || !description.value.trim()) {
    errorMessage.value = 'Complete el título y la descripción detallada del requerimiento.';
    return;
  }

  if (!fechaRequerida.value) {
    errorMessage.value = 'Indique la fecha en que necesita recibir el dato.';
    return;
  }

  const isoFecha = fechaCalendarioToIso(fechaRequerida.value);
  if (!esFechaRequeridaPosteriorAHoy(isoFecha)) {
    errorMessage.value =
      'La fecha requerida debe ser posterior a hoy (regla de negocio: calendario America/La_Paz).';
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
      fechaRequerida: isoFecha,
      camposRequeridos: camposRequeridos.value.trim() || undefined,
    });

    const newId = res.data?.id || res.id;
    if (newId && archivosPendientes.value.length) {
      try {
        await subirAdjuntosTrasCrear(newId);
      } catch (uploadErr: any) {
        errorMessage.value =
          uploadErr.response?.data?.message ||
          uploadErr.message ||
          'La solicitud se creó, pero falló la carga de adjuntos.';
        router.push(`/solicitudes/${newId}`);
        return;
      }
    }
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
            Complete el formulario con el plazo requerido, los campos de data y el alcance técnico. Los archivos
            seleccionados se suben automáticamente al crear la solicitud.
          </p>
        </div>
      </div>

      <div v-if="errorMessage" class="error-banner">
        <font-awesome-icon icon="circle-exclamation" />
        <span>{{ errorMessage }}</span>
      </div>

      <form class="form-stack" @submit.prevent="handleSubmit">
        <!-- Bloque 1: identificación -->
        <section class="form-card">
          <h2 class="section-title">
            <span class="section-accent" />
            Datos generales
          </h2>

          <div class="form-row">
            <div class="form-group flex-2">
              <label for="title">Título del requerimiento <span class="required">*</span></label>
              <input
                id="title"
                v-model="title"
                type="text"
                class="form-control"
                placeholder="Ej. Extracción de cartera PyME morosa para auditoría ASFI"
                required
              />
            </div>

            <div class="form-group flex-1">
              <label for="priority">Prioridad <span class="required">*</span></label>
              <select id="priority" v-model="priority" class="form-control" required>
                <option v-for="p in priorities" :key="p.value" :value="p.value">
                  {{ p.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="category">Categoría <span class="required">*</span></label>
              <select id="category" v-model="category" class="form-control" required>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <div class="form-group flex-1">
              <label for="justification">Justificación de negocio / ASFI</label>
              <input
                id="justification"
                v-model="justification"
                type="text"
                class="form-control"
                placeholder="Motivo regulatorio, gerencial o normativo (opcional)"
              />
            </div>
          </div>
        </section>

        <!-- Bloque 2: plazo y campos (mockup 01) -->
        <section class="form-card form-card-highlight">
          <h2 class="section-title">
            <span class="section-accent section-accent-purple" />
            Plazo y campos solicitados
          </h2>

          <div class="form-row align-start">
            <div class="form-group flex-1">
              <label for="fechaRequerida">Fecha requerida del dato <span class="required">*</span></label>
              <DatePicker
                id="fechaRequerida"
                v-model="fechaRequerida"
                :min-date="minFechaRequerida"
                date-format="dd/mm/yy"
                show-icon
                fluid
                placeholder="Seleccione día posterior a hoy"
                input-class="form-control-datepicker"
              />
              <small class="help-text">
                Día en que necesita el entregable. Debe ser posterior a hoy (validación API en zona
                <strong>America/La_Paz</strong>).
              </small>
              <p v-if="fechaRequerida" class="fecha-preview">
                Plazo seleccionado: {{ formatearFechaLarga(fechaRequerida) }}
              </p>
            </div>
          </div>

          <div class="form-group">
            <label for="camposRequeridos">Campos o variables requeridas</label>
            <Textarea
              id="camposRequeridos"
              v-model="camposRequeridos"
              rows="4"
              class="w-full"
              placeholder="Liste campos, tablas, filtros o variables. Ej.: saldo, días de mora, fecha_corte, segmento..."
            />
            <small class="help-text">Detalle los campos de la data; facilita la estimación del analista.</small>
          </div>
        </section>

        <!-- Bloque 3: alcance -->
        <section class="form-card">
          <h2 class="section-title">
            <span class="section-accent" />
            Descripción y alcance
          </h2>

          <div class="form-group">
            <label for="description">Descripción detallada <span class="required">*</span></label>
            <Textarea
              id="description"
              v-model="description"
              rows="6"
              class="w-full"
              placeholder="Período, filtros, formato de entrega, criterios de calidad..."
              required
            />
          </div>
        </section>

        <section class="form-card">
          <h2 class="section-title">
            <span class="section-accent section-accent-muted" />
            Archivos adjuntos (opcional)
          </h2>
          <p class="help-text adjuntos-intro">
            Especificaciones, plantillas o muestras. Se cargan al enviar la solicitud (máx.
            {{ ADJUNTO_MAX_POR_SOLICITUD }} archivos).
          </p>
          <input
            ref="fileInputNueva"
            type="file"
            class="hidden-file-input"
            :accept="acceptAdjuntos"
            multiple
            @change="onSeleccionArchivos"
          />
          <Button
            type="button"
            label="Seleccionar archivos"
            icon="pi pi-upload"
            severity="secondary"
            :disabled="archivosPendientes.length >= ADJUNTO_MAX_POR_SOLICITUD"
            @click="fileInputNueva?.click()"
          />
          <ul v-if="archivosPendientes.length" class="pendientes-list">
            <li v-for="(f, idx) in archivosPendientes" :key="`${f.name}-${idx}`" class="pendiente-item">
              <font-awesome-icon icon="folder" />
              <span>{{ f.name }}</span>
              <button type="button" class="btn-quitar" title="Quitar" @click="quitarPendiente(idx)">
                <font-awesome-icon icon="xmark" />
              </button>
            </li>
          </ul>
        </section>

        <div class="form-actions">
          <router-link to="/solicitudes" class="btn-secondary">Cancelar</router-link>
          <Button
            type="submit"
            label="Enviar solicitud"
            icon="pi pi-check"
            :loading="submitting"
            class="btn-submit"
          />
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
  line-height: 1.45;
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

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-card-highlight {
  border-left: 4px solid var(--bnb-purple);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.section-accent {
  width: 4px;
  height: 1.25rem;
  border-radius: 2px;
  background: var(--bnb-green);
}

.section-accent-purple {
  background: var(--bnb-purple);
}

.section-accent-muted {
  background: #cbd5e1;
}

.form-row {
  display: flex;
  gap: 1.5rem;
}

.align-start {
  align-items: flex-start;
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

:deep(.form-control-datepicker) {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.help-text {
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.4;
}

.fecha-preview {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--bnb-purple);
  font-weight: 600;
}

.hidden-file-input {
  display: none;
}

.adjuntos-intro {
  margin-bottom: 1rem;
}

.pendientes-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pendiente-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.btn-quitar {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
}

.btn-quitar:hover {
  color: #ef4444;
}

.adjuntos-placeholder {
  opacity: 0.95;
}

.adjuntos-box {
  border: 2px dashed #e2e8f0;
  border-radius: 10px;
  padding: 1.75rem;
  text-align: center;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.adjuntos-icon {
  font-size: 2rem;
  color: #94a3b8;
}

.adjuntos-text {
  max-width: 480px;
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.5rem 0 2rem;
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
  display: inline-flex;
  align-items: center;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

:deep(.btn-submit.p-button) {
  background: var(--bnb-green);
  border-color: var(--bnb-green);
  font-weight: 600;
}

:deep(.btn-submit.p-button:not(:disabled):hover) {
  background: var(--bnb-green-hover);
  border-color: var(--bnb-green-hover);
}

.w-full {
  width: 100%;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: 1.25rem;
  }
}
</style>