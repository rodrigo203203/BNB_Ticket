import { Role, RequestStatus, RequestPriority, RequestCategory, AuditAction } from '../enums/index.js';
import type { NivelCarga } from '../utils/carga-equipo.js';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  role: Role;
  area: string;
  isActive: boolean;
  isLocked: boolean;
  mustChangePassword?: boolean;
  failedAttempts: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  isValid: boolean;
  isCurrent?: boolean;
  expiresAt: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface SolicitudAuditEntry {
  id: string;
  solicitudId: string;
  authorId: string;
  authorName: string;
  previousStatus: RequestStatus | null;
  newStatus: RequestStatus;
  comment: string;
  createdAt: string;
}

export interface SolicitudAdjuntoItem {
  id: string;
  solicitudId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
}

export interface SolicitudItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  requesterId: string;
  requesterName: string;
  requesterArea: string;
  justification?: string | null;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;
  estimatedHours: number | null;
  fechaRequerida: string | null;
  fechaEntrega: string | null;
  camposRequeridos: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  history?: SolicitudAuditEntry[];
  adjuntos?: SolicitudAdjuntoItem[];
}

export interface DashboardStatsSolicitante {
  totalSolicitudes: number;
  enProceso: number;
  aprobadas: number;
  rechazadas: number;
  canceladas: number;
  misSolicitudesRecientes: SolicitudItem[];
}

export interface DashboardAnalisisKpi {
  valor: number;
  deltaVsPeriodoAnterior: number | null;
}

export interface DashboardAnalisisResumen {
  solicitudesPeriodo: DashboardAnalisisKpi;
  tiempoPromedioRespuestaDias: DashboardAnalisisKpi;
  entregadasATiempoPct: DashboardAnalisisKpi;
  vencidas: DashboardAnalisisKpi;
  aprobacionesPendientes: DashboardAnalisisKpi;
}

export interface EncargadoConCarga {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  area: string;
  puntosCarga: number;
  nivel: NivelCarga;
  activas: number;
  vencidas: number;
}

export interface EquipoCargaPersonaRow extends EncargadoConCarga {
  porEstado: Record<string, number>;
  porVencer: number;
  proximaFechaEntrega: string | null;
  proximaSolicitudCodigo: string | null;
  proximaSolicitudId: string | null;
  proximaEntregaAtrasada?: boolean;
}

export interface EquipoCargaResponse {
  resumen: {
    personas: number;
    activasTotales: number;
  /** Vencidas en filas de encargados (B7). */
    vencidasTotales: number;
    /** Activas sin asignar contadas con esSolicitudVencida (R3-7). */
    vencidasSinAsignar?: number;
    porVencerTotales: number;
  };
  personas: EquipoCargaPersonaRow[];
}

export interface SolicitudGanttItem {
  id: string;
  code: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  assignedAnalystName: string | null;
  /** Spark M9: área solicitante en columna «Analista · Área». */
  requesterArea?: string;
  assignedAnalystId?: string | null;
  fechaRequerida: string | null;
  fechaEntrega: string | null;
  createdAt: string;
  /** Sin fecha de entrega comprometida: la barra se dibuja con trazo discontinuo. */
  sinFechaEntrega: boolean;
  /** Igual criterio que dashboard (`esSolicitudVencida`); rechazada/cancelada siempre false. */
  vencida: boolean;
}

export interface DashboardAnalisisAreaRow {
  area: string;
  count: number;
}

export interface DashboardAnalisisCargaAnalistaRow {
  analistaId: string | null;
  analistaNombre: string;
  porEstado: Record<RequestStatus, number>;
  vencidas: number;
}

export interface DashboardAnalisisStats {
  resumen: DashboardAnalisisResumen;
  porEstado: Record<RequestStatus, number>;
  porAreaRequester: DashboardAnalisisAreaRow[];
  entregaPlazo: { aTiempo: number; conAtraso: number };
  tiempoRespuestaPorMes: Array<{ mes: string; promedioDias: number | null }>;
  cargaPorAnalista: DashboardAnalisisCargaAnalistaRow[];
  serieMensual: Array<{ mes: string; creadas: number; cerradas: number; vencidas: number }>;
  areasDisponibles: string[];
  periodo: { desde: string; hasta: string; clave: '7d' | '30d' | '90d' | 'custom' };
}

export interface DashboardStatsAnalista {
  asignadas: number;
  enAnalisis: number;
  enRevisionCoordinacion: number;
  completadasMes: number;
  solicitudesPendientes: SolicitudItem[];
}

export interface DashboardStatsCoordinador {
  pendientesRevision: number;
  totalActivas: number;
  solicitudesPorAnalista: Array<{ analystName: string; count: number }>;
  distribucionPorEstado: Record<RequestStatus, number>;
  solicitudesPorAprobar: SolicitudItem[];
}

export interface DashboardStatsAdministrador {
  totalUsuarios: number;
  sesionesActivas: number;
  solicitudesTotales: number;
  cuentasBloqueadas: number;
  ultimosEventosAuditoria: Array<{
    id: string;
    action: AuditAction;
    details: string;
    userEmail: string;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export type DashboardStats =
  | { role: Role.SOLICITANTE; data: DashboardStatsSolicitante }
  | { role: Role.ANALISTA; data: DashboardStatsAnalista }
  | { role: Role.COORDINADOR; data: DashboardStatsCoordinador }
  | { role: Role.ADMINISTRADOR; data: DashboardStatsAdministrador };

export interface AuthLoginResponse {
  user: UserSummary;
  csrfToken: string;
  expiresIn: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    statusCode: number;
    code: string;
    message: string | string[];
    timestamp: string;
    path: string;
  };
}
