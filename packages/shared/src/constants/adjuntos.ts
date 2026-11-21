/** Límites de adjuntos de solicitud (alineado con validación API). */
export const ADJUNTO_MAX_BYTES = 10 * 1024 * 1024;
export const ADJUNTO_MAX_POR_SOLICITUD = 5;
export const ADJUNTO_EXTENSIONES_PERMITIDAS = ['pdf', 'xlsx', 'csv', 'docx'] as const;