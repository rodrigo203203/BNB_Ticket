import { RequestStatus, Role, RequestCategory, RequestPriority } from '../enums/index.js';

export const BNB_COLORS = {
  primary: '#26b460',       // Verde institucional BNB
  primaryHover: '#1f9750',
  primaryLight: '#e9f8ef',
  secondary: '#5b21b6',     // Morado tokenizado BNB
  secondaryHover: '#4c1d95',
  secondaryLight: '#f3e8ff',
  dark: '#0f172a',
  surface: '#ffffff',
  background: '#f8fafc',
  border: '#e2e8f0',
  textMuted: '#64748b',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SOLICITANTE]: 'Solicitante',
  [Role.ANALISTA]: 'Analista de Datos',
  [Role.COORDINADOR]: 'Coordinador de Gobierno & Analítica',
  [Role.ADMINISTRADOR]: 'Administrador del Sistema',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.REGISTRADA]: 'Registrada',
  [RequestStatus.EN_ANALISIS]: 'En Análisis',
  [RequestStatus.EN_REVISION_COORDINACION]: 'En Revisión Coordinación',
  [RequestStatus.APROBADA]: 'Aprobada',
  [RequestStatus.RECHAZADA]: 'Rechazada',
  [RequestStatus.CANCELADA]: 'Cancelada',
};

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  [RequestCategory.EXTRACCION_DATOS]: 'Extracción de Información',
  [RequestCategory.REPORTES_BI]: 'Reportes y Business Intelligence',
  [RequestCategory.MODELOS_ML]: 'Modelos de Machine Learning & IA',
  [RequestCategory.CALIDAD_DATOS]: 'Calidad y Validación de Datos',
  [RequestCategory.GOBIERNO_DATOS]: 'Gobierno y Catálogos de Información',
  [RequestCategory.ACCESO_BD]: 'Acceso a Bases de Datos / Réplicas',
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  [RequestPriority.BAJA]: 'Baja',
  [RequestPriority.MEDIA]: 'Media',
  [RequestPriority.ALTA]: 'Alta',
  [RequestPriority.URGENTE]: 'Urgente',
};

export const STATUS_BADGE_SEVERITY: Record<RequestStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
  [RequestStatus.REGISTRADA]: 'info',
  [RequestStatus.EN_ANALISIS]: 'warn',
  [RequestStatus.EN_REVISION_COORDINACION]: 'secondary',
  [RequestStatus.APROBADA]: 'success',
  [RequestStatus.RECHAZADA]: 'danger',
  [RequestStatus.CANCELADA]: 'danger',
};

/**
 * Matriz RBAC de transiciones permitidas según el rol
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<Role, Record<RequestStatus, RequestStatus[]>> = {
  [Role.SOLICITANTE]: {
    [RequestStatus.REGISTRADA]: [RequestStatus.CANCELADA],
    [RequestStatus.EN_ANALISIS]: [],
    [RequestStatus.EN_REVISION_COORDINACION]: [],
    [RequestStatus.APROBADA]: [],
    [RequestStatus.RECHAZADA]: [],
    [RequestStatus.CANCELADA]: [],
  },
  [Role.ANALISTA]: {
    [RequestStatus.REGISTRADA]: [RequestStatus.EN_ANALISIS],
    [RequestStatus.EN_ANALISIS]: [RequestStatus.EN_REVISION_COORDINACION, RequestStatus.RECHAZADA],
    [RequestStatus.EN_REVISION_COORDINACION]: [],
    [RequestStatus.APROBADA]: [],
    [RequestStatus.RECHAZADA]: [],
    [RequestStatus.CANCELADA]: [],
  },
  [Role.COORDINADOR]: {
    [RequestStatus.REGISTRADA]: [RequestStatus.EN_ANALISIS, RequestStatus.RECHAZADA],
    [RequestStatus.EN_ANALISIS]: [RequestStatus.EN_REVISION_COORDINACION, RequestStatus.RECHAZADA],
    [RequestStatus.EN_REVISION_COORDINACION]: [RequestStatus.APROBADA, RequestStatus.RECHAZADA, RequestStatus.EN_ANALISIS],
    [RequestStatus.APROBADA]: [],
    [RequestStatus.RECHAZADA]: [],
    [RequestStatus.CANCELADA]: [],
  },
  [Role.ADMINISTRADOR]: {
    [RequestStatus.REGISTRADA]: [RequestStatus.EN_ANALISIS, RequestStatus.RECHAZADA, RequestStatus.CANCELADA],
    [RequestStatus.EN_ANALISIS]: [RequestStatus.EN_REVISION_COORDINACION, RequestStatus.RECHAZADA, RequestStatus.CANCELADA],
    [RequestStatus.EN_REVISION_COORDINACION]: [RequestStatus.APROBADA, RequestStatus.RECHAZADA, RequestStatus.EN_ANALISIS],
    [RequestStatus.APROBADA]: [RequestStatus.EN_REVISION_COORDINACION],
    [RequestStatus.RECHAZADA]: [RequestStatus.REGISTRADA],
    [RequestStatus.CANCELADA]: [RequestStatus.REGISTRADA],
  },
};

export const AUTH_CONSTANTS = {
  COOKIE_NAME: 'bnb_session',
  CSRF_HEADER_NAME: 'x-csrf-token',
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  SESSION_HOURS: 168,
} as const;
