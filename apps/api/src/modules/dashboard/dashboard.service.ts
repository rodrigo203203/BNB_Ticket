import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Role,
  RequestStatus,
  RequestCategory,
  UserSummary,
  DashboardStats,
  DashboardStatsSolicitante,
  DashboardStatsAnalista,
  DashboardStatsCoordinador,
  DashboardStatsAdministrador,
  DashboardAnalisisStats,
  obtenerMesCalendarioEnZona,
} from '@bnb/shared';
import {
  computarAnalisisDesdeSolicitudes,
  resolverVentanaAnalisis,
} from './dashboard-analisis.util';
import { DashboardAnalisisQueryDto } from './dto/dashboard-analisis-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Panel analítico operativo (boceto 02); solicitante recibe 403. */
  async getAnalisisForUser(
    user: UserSummary,
    query: DashboardAnalisisQueryDto = {},
  ): Promise<DashboardAnalisisStats> {
    if (user.role === Role.SOLICITANTE) {
      throw new ForbiddenException('El dashboard de análisis no está disponible para solicitantes');
    }

    const ventana = resolverVentanaAnalisis(query);
    const whereRol: Record<string, unknown> =
      user.role === Role.ANALISTA ? { assignedAnalystId: user.id } : {};
    const whereConsulta = { ...whereRol } as Record<string, unknown>;
    if (query.area?.trim()) {
      whereConsulta.requesterArea = query.area.trim();
    }

    const ambitoMinimo = ventana.desdeAnterior ?? ventana.desde;

    const areasRows = await this.prisma.solicitud.findMany({
      where: whereRol,
      select: { requesterArea: true },
    });
    const areasDisponibles = [
      ...new Set(areasRows.map((a) => a.requesterArea).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, 'es'));

    const rows = await this.prisma.solicitud.findMany({
      where: {
        ...whereConsulta,
        createdAt: { gte: ambitoMinimo, lte: ventana.hasta },
      },
      select: {
        status: true,
        category: true,
        fechaRequerida: true,
        fechaEntrega: true,
        closedAt: true,
        requesterArea: true,
        createdAt: true,
        assignedAnalystId: true,
        assignedAnalyst: { select: { fullName: true } },
      },
    });

    const core = computarAnalisisDesdeSolicitudes(
      rows.map((r) => ({
        status: r.status as RequestStatus,
        category: r.category as RequestCategory,
        fechaRequerida: r.fechaRequerida,
        fechaEntrega: r.fechaEntrega,
        closedAt: r.closedAt,
        requesterArea: r.requesterArea,
        createdAt: r.createdAt,
        assignedAnalystId: r.assignedAnalystId,
        assignedAnalystName: r.assignedAnalyst?.fullName ?? null,
      })),
      ventana,
    );

    return {
      ...core,
      areasDisponibles,
    };
  }

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
    const [totalSolicitudes, enProceso, aprobadas, rechazadas, canceladas, recientes] = await Promise.all([
      this.prisma.solicitud.count({ where: { requesterId: userId } }),
      this.prisma.solicitud.count({
        where: {
          requesterId: userId,
          status: { in: [RequestStatus.REGISTRADA, RequestStatus.EN_ANALISIS, RequestStatus.EN_REVISION_COORDINACION] },
        },
      }),
      this.prisma.solicitud.count({ where: { requesterId: userId, status: RequestStatus.APROBADA } }),
      this.prisma.solicitud.count({ where: { requesterId: userId, status: RequestStatus.RECHAZADA } }),
      this.prisma.solicitud.count({ where: { requesterId: userId, status: RequestStatus.CANCELADA } }),
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
      canceladas,
      misSolicitudesRecientes: recientes.map((r) => this.mapSimple(r)),
    };
  }

  private async getAnalistaStats(userId: string): Promise<DashboardStatsAnalista> {
    const mesActual = obtenerMesCalendarioEnZona(new Date());
    const aprobadasConCierre = await this.prisma.solicitud.findMany({
      where: {
        assignedAnalystId: userId,
        status: RequestStatus.APROBADA,
        closedAt: { not: null },
      },
      select: { closedAt: true },
    });
    const completadasMes = aprobadasConCierre.filter(
      (s) => s.closedAt && obtenerMesCalendarioEnZona(s.closedAt) === mesActual,
    ).length;

    const [asignadas, enAnalisis, enRevisionCoordinacion, pendientes] = await Promise.all([
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId } }),
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId, status: RequestStatus.EN_ANALISIS } }),
      this.prisma.solicitud.count({ where: { assignedAnalystId: userId, status: RequestStatus.EN_REVISION_COORDINACION } }),
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
      fechaRequerida: raw.fechaRequerida ? raw.fechaRequerida.toISOString() : null,
      fechaEntrega: raw.fechaEntrega ? raw.fechaEntrega.toISOString() : null,
      camposRequeridos: raw.camposRequeridos ?? null,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      closedAt: raw.closedAt ? raw.closedAt.toISOString() : null,
    };
  }
}
