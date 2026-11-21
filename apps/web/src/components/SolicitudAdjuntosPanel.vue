<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import { apiClient } from '../api/client';
import {
  ADJUNTO_EXTENSIONES_PERMITIDAS,
  ADJUNTO_MAX_BYTES,
  ADJUNTO_MAX_POR_SOLICITUD,
  RequestStatus,
  Role,
  SolicitudAdjuntoItem,
  formatearFechaCalendarioLaPaz,
} from '@bnb/shared';
import { useAuthStore } from '../stores/auth.store';

const props = defineProps<{
  solicitudId: string;
  requesterId: string;
  status: RequestStatus;
  /** Adjuntos ya incluidos en el detalle (evita GET inicial si vienen del padre). */
  initialAdjuntos?: SolicitudAdjuntoItem[];
}>();

const emit = defineEmits<{
  (e: 'updated', adjuntos: SolicitudAdjuntoItem[]): void;
}>();

const authStore = useAuthStore();
const adjuntos = ref<SolicitudAdjuntoItem[]>(props.initialAdjuntos ? [...props.initialAdjuntos] : []);
const loading = ref(false);
const uploading = ref(false);
const errorMessage = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const acceptAttr = computed(() =>
  ADJUNTO_EXTENSIONES_PERMITIDAS.map((e) => `.${e}`).join(','),
);

const puedeSubir = computed(() => {
  if (!authStore.user) return false;
  return (
    authStore.user.id === props.requesterId &&
    props.status === RequestStatus.REGISTRADA &&
    adjuntos.value.length < ADJUNTO_MAX_POR_SOLICITUD
  );
});

const puedeEliminar = computed(() => puedeSubir.value);

async function cargarLista() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiClient.get<any, any>(`/solicitudes/${props.solicitudId}/adjuntos`);
    adjuntos.value = res.data || res || [];
    emit('updated', adjuntos.value);
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'No se pudo cargar la lista de adjuntos';
  } finally {
    loading.value = false;
  }
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validarArchivoLocal(file: File): string | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ADJUNTO_EXTENSIONES_PERMITIDAS.includes(ext as (typeof ADJUNTO_EXTENSIONES_PERMITIDAS)[number])) {
    return 'Formato no permitido. Use PDF, XLSX, CSV o DOCX.';
  }
  if (file.size > ADJUNTO_MAX_BYTES) {
    return 'Cada adjunto no puede superar 10 MB.';
  }
  if (adjuntos.value.length >= ADJUNTO_MAX_POR_SOLICITUD) {
    return `Máximo ${ADJUNTO_MAX_POR_SOLICITUD} adjuntos por solicitud.`;
  }
  return null;
}

function abrirSelector() {
  fileInput.value?.click();
}

async function subirArchivo(file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await apiClient.post(`/solicitudes/${props.solicitudId}/adjuntos`, form);
}

async function handleFilesSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  input.value = '';
  if (!files.length) return;

  uploading.value = true;
  errorMessage.value = '';

  try {
    for (const file of files) {
      if (adjuntos.value.length >= ADJUNTO_MAX_POR_SOLICITUD) break;
      const err = validarArchivoLocal(file);
      if (err) {
        errorMessage.value = err;
        break;
      }
      await subirArchivo(file);
    }
    await cargarLista();
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'Error al subir el archivo';
  } finally {
    uploading.value = false;
  }
}

/** Expuesto para flujo “crear solicitud y luego adjuntar”. */
async function subirPendientes(files: File[]): Promise<void> {
  uploading.value = true;
  errorMessage.value = '';
  try {
    for (const file of files) {
      if (adjuntos.value.length >= ADJUNTO_MAX_POR_SOLICITUD) break;
      const err = validarArchivoLocal(file);
      if (err) throw new Error(err);
      await subirArchivo(file);
    }
    await cargarLista();
  } finally {
    uploading.value = false;
  }
}

async function descargar(adj: SolicitudAdjuntoItem) {
  try {
    const res = await apiClient.get<Blob, Blob>(
      `/solicitudes/${props.solicitudId}/adjuntos/${adj.id}/descarga`,
      { responseType: 'blob', skipGlobalErrorHandler: true },
    );
    const blob = res instanceof Blob ? res : (res as any).data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = adj.originalName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    errorMessage.value = err.message || 'No se pudo descargar el archivo';
  }
}

async function eliminar(adj: SolicitudAdjuntoItem) {
  if (!puedeEliminar.value) return;
  if (!confirm(`¿Eliminar el adjunto "${adj.originalName}"?`)) return;
  try {
    await apiClient.delete(`/solicitudes/${props.solicitudId}/adjuntos/${adj.id}`);
    await cargarLista();
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'No se pudo eliminar el adjunto';
  }
}

watch(
  () => props.solicitudId,
  () => {
    if (props.solicitudId) cargarLista();
  },
);

onMounted(() => {
  if (!props.initialAdjuntos?.length) {
    cargarLista();
  }
});

defineExpose({ subirPendientes, cargarLista });
</script>

<template>
  <div class="adjuntos-panel">
    <div v-if="errorMessage" class="adjuntos-error">
      <font-awesome-icon icon="circle-exclamation" />
      {{ errorMessage }}
    </div>

    <div v-if="loading && !adjuntos.length" class="adjuntos-loading">
      <font-awesome-icon icon="spinner" spin />
      Cargando adjuntos…
    </div>

    <ul v-else-if="adjuntos.length" class="adjuntos-list">
      <li v-for="adj in adjuntos" :key="adj.id" class="adjunto-row">
        <div class="adjunto-info">
          <font-awesome-icon icon="folder" class="adjunto-icon" />
          <div>
            <span class="adjunto-name">{{ adj.originalName }}</span>
            <span class="adjunto-meta">
              {{ formatearTamano(adj.sizeBytes) }} ·
              {{ formatearFechaCalendarioLaPaz(adj.createdAt) }}
            </span>
          </div>
        </div>
        <div class="adjunto-actions">
          <Button
            type="button"
            label="Descargar"
            icon="pi pi-download"
            severity="secondary"
            text
            size="small"
            @click="descargar(adj)"
          />
          <Button
            v-if="puedeEliminar"
            type="button"
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            title="Eliminar adjunto"
            @click="eliminar(adj)"
          />
        </div>
      </li>
    </ul>

    <p v-else class="adjuntos-empty">Sin archivos adjuntos.</p>

    <div v-if="puedeSubir" class="adjuntos-upload-row">
      <input
        ref="fileInput"
        type="file"
        class="hidden-input"
        :accept="acceptAttr"
        multiple
        @change="handleFilesSelected"
      />
      <Button
        type="button"
        label="Agregar archivo"
        icon="pi pi-upload"
        severity="secondary"
        :loading="uploading"
        :disabled="adjuntos.length >= ADJUNTO_MAX_POR_SOLICITUD"
        @click="abrirSelector"
      />
      <small class="adjuntos-hint">
        PDF, XLSX, CSV o DOCX · máx. 10 MB · hasta {{ ADJUNTO_MAX_POR_SOLICITUD }} archivos
      </small>
    </div>

    <p v-else-if="authStore.user?.role !== Role.SOLICITANTE" class="adjuntos-readonly">
      Adjuntos enviados por el solicitante.
    </p>
  </div>
</template>

<style scoped>
.adjuntos-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.adjuntos-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #b91c1c;
  font-size: 0.875rem;
  background: #fef2f2;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.adjuntos-loading {
  color: #64748b;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.adjuntos-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.adjunto-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.adjunto-info {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}

.adjunto-icon {
  color: var(--bnb-purple);
  margin-top: 0.15rem;
}

.adjunto-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
  word-break: break-word;
}

.adjunto-meta {
  font-size: 0.78rem;
  color: #64748b;
}

.adjunto-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.adjuntos-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.adjuntos-upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.hidden-input {
  display: none;
}

.adjuntos-hint {
  color: #64748b;
  font-size: 0.78rem;
}

.adjuntos-readonly {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
}
</style>