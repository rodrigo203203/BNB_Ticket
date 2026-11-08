import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Role,
  RequestStatus,
  UserSummary,
  DashboardStats,
  DashboardStatsSolicitante,
  DashboardStatsAnalista,
  DashboardStatsCoordinador,
  DashboardStatsAdministrador,
} from '@bnb/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetricsForUser(user: UserSummary): Promise<DashboardStats> {
    switch (user.role) {
      case Role.SOLICITANTE:
        return {
          role: Role.SOLICITANTE,
          data: await this.getSolicitanteStats(user.id),
        };
      case Role.ANALISTA:
        return {
          role: Role.ANALISTA,
          data: await this.getAnalistaStats(user.id),
        };
      case Role.COORDINADOR:
        return {
          role: Role.COORDINADOR,
          data: await this.getCoordinadorStats(),
        };
      case Role.ADMINISTRADOR:
      default:
        return {
          role: Role.ADMINISTRADOR,
          data: await this.getAdminStats(),
        };
    }
  }

  private async getSolicitanteStats(userId: string): Promise<DashboardStatsSolicitante> {
    const [totalSolicitudes, enProceso, aprobadas, rechazadas, recientes] = await Promise.all([
      this.prisma.solicitud.count({ where: { requesterId: userId } }),
      this.prisma.solicitud.count({
        where: {
          requesterId: userId,
          status: { in: [RequestStatus.REGISTRADA, RequestStatus.EN_ANALISIS, RequestStatus.EN_REVISION_COORDINACION] },
        },
      }),
      this.prisma.solicitud.count({ where: { requesterId: userId, status: RequestStatus.APROBADA } }),
      this.prisma.solicitud.count({ where: { requesterId: userId, status: RequestStatus.RECHAZADA } }),
      this.prisma.solicitud.findMany({
        where: { requesterId: userId },
        include: { requester: true, assignedAnalyst: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalSolicitudes,
      enProceso,
      aprobadas,
      rechazadas,
      misSolicitudesRecientes: recientes.map((r) => this.mapSimple(r)),
    };
  }

  private async getAnalistaStats(userId: string): Promise<DashboardStatsAnalista> {
    const [asignadas, enAnalisis, enRevisionCoordinacion, completadasMes, pendientes] = await Promise.all([
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId } }),
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId, status: RequestStatus.EN_ANALISIS } }),
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId, status: RequestStatus.EN_REVISION_COORDINACION } }),
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId, status: RequestStatus.APROBADA } }),
      this.prisma.solicitud.findMany({
        where: {
          assignedAnalystId: userId,
          status: { in: [RequestStatus.EN_ANALISIS, RequestStatus.EN_REVISION_COORDINACION] },
        },
        include: { requester: true, assignedAnalyst: true },
        orderBy: { priority: 'desc' },
        take: 5,
      }),
    ]);

    return {
      asignadas,
      enAnalisis,
      enRevisionCoordinacion,
      completadasMes,
      solicitudesPendientes: pendientes.map((p) => this.mapSimple(p)),
    };
  }

  private async getCoordinadorStats(): Promise<DashboardStatsCoordinador> {
    const [pendientesRevision, totalActivas, allSolicitudes] = await Promise.all([
      this.prisma.solicitud.count({ where: { status: RequestStatus.EN_REVISION_COORDINACION } }),
      this.prisma.solicitud.count({
        where: {
          status: { notIn: [RequestStatus.APROBADA, RequestStatus.RECHAZADA, RequestStatus.CANCELADA] },
        },
      }),
      this.prisma.solicitud.findMany({
        include: { requester: true, assignedAnalyst: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const distribucionPorEstado: Record<RequestStatus, number> = {
      [RequestStatus.REGISTRADA]: 0,
      [RequestStatus.EN_ANALISIS]: 0,
      [RequestStatus.EN_REVISION_COORDINACION]: 0,
      [RequestStatus.APROBADA]: 0,
      [RequestStatus.RECHAZADA]: 0,
      [RequestStatus.CANCELADA]: 0,
    };

    const analystCounts: Record<string, number> = {};

    allSolicitudes.forEach((s) => {
      distribucionPorEstado[s.status as RequestStatus] = (distribucionPorEstado[s.status as RequestStatus] || 0) + 1;
      const analystName = s.assignedAnalyst?.fullName || 'Sin Asignar';
      analystCounts[analystName] = (analystCounts[analystName] || 0) + 1;
    });

    const solicitudesPorAnalista = Object.entries(analystCounts).map(([analystName, count]) => ({
      analystName,
      count,
    }));

    const porAprobar = allSolicitudes
      .filter((s) => s.status === RequestStatus.EN_REVISION_COORDINACION)
      .slice(0, 5)
      .map((s) => this.mapSimple(s));

    return {
      pendientesRevision,
      totalActivas,
      solicitudesPorAnalista,
      distribucionPorEstado,
      solicitudesPorAprobar: porAprobar,
    };
  }

  private async getAdminStats(): Promise<DashboardStatsAdministrador> {
    const [totalUsuarios, sesionesActivas, solicitudesTotales, cuentasBloqueadas, ultimosEventos] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.session.count({ where: { isValid: true, expiresAt: { gt: new Date() } } }),
        this.prisma.solicitud.count(),
        this.prisma.user.count({ where: { isLocked: true } }),
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      totalUsuarios,
      sesionesActivas,
      solicitudesTotales,
      cuentasBloqueadas,
      ultimosEventosAuditoria: ultimosEventos.map((e) => ({
        id: e.id,
        action: e.action as any,
        details: e.details,
        userEmail: e.userEmail,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  private mapSimple(raw: any) {
    return {
      id: raw.id,
      code: raw.code,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      priority: raw.priority,
      status: raw.status,
      requesterId: raw.requesterId,
      requesterName: raw.requester?.fullName || 'N/A',
      requesterArea: raw.requesterArea || 'N/A',
      assignedAnalystId: raw.assignedAnalystId,
      assignedAnalystName: raw.assignedAnalyst?.fullName || null,
      estimatedHours: raw.estimatedHours,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      closedAt: raw.closedAt ? raw.closedAt.toISOString() : null,
    };
  }
}
