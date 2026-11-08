import { Role, RequestStatus, RequestPriority, RequestCategory, AuditAction } from '../enums/index.js';

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
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  history?: SolicitudAuditEntry[];
}

export interface DashboardStatsSolicitante {
  totalSolicitudes: number;
  enProceso: number;
  aprobadas: number;
  rechazadas: number;
  misSolicitudesRecientes: SolicitudItem[];
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
