/** Tipos MIME permitidos para adjuntos de solicitud (sin ejecutables). */
export const ADJUNTO_MIME_PERMITIDOS = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const ADJUNTO_MAX_BYTES = 10 * 1024 * 1024;
export const ADJUNTO_MAX_POR_SOLICITUD = 5;

const EXT_PERMITIDAS = new Set(['pdf', 'csv', 'xlsx', 'docx']);

export function validarAdjuntoSolicitud(
  buffer: Buffer,
  originalName: string,
  declaredMime?: string,
): { mime: string; ext: string; safeName: string } {
  if (!buffer?.length) {
    throw new Error('El archivo está vacío');
  }
  if (buffer.length > ADJUNTO_MAX_BYTES) {
    throw new Error('Cada adjunto no puede superar 10 MB');
  }

  const ext = (originalName.split('.').pop() || '').toLowerCase();
  if (!EXT_PERMITIDAS.has(ext)) {
    throw new Error('Formato no permitido. Use PDF, XLSX, CSV o DOCX');
  }

  if (ext === 'pdf' && buffer.slice(0, 4).toString() !== '%PDF') {
    throw new Error('El archivo PDF no es válido');
  }
  if ((ext === 'xlsx' || ext === 'docx') && buffer[0] !== 0x50 && buffer[1] !== 0x4b) {
    throw new Error('El archivo Office no es válido (ZIP)');
  }

  let mime = declaredMime || '';
  if (ext === 'pdf') mime = 'application/pdf';
  if (ext === 'csv') mime = 'text/csv';
  if (ext === 'xlsx') mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (declaredMime && !ADJUNTO_MIME_PERMITIDOS.has(declaredMime)) {
    throw new Error('Tipo MIME no permitido');
  }

  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
  return { mime, ext, safeName };
}