import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Role,
  RequestStatus,
  RequestPriority,
  ALLOWED_STATUS_TRANSITIONS,
  AuditAction,
  SolicitudItem,
  UserSummary,
} from '@bnb/shared';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudStatusDto } from './dto/update-status.dto';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { AssignAnalystDto } from './dto/assign-analyst.dto';
import { AddCommentDto } from './dto/add-comment.dto';

@Injectable()
export class SolicitudesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSolicitudDto, user: UserSummary): Promise<SolicitudItem> {
    const year = new Date().getFullYear();
    const countToday = await this.prisma.solicitud.count();
    const code = `REQ-${year}-${String(countToday + 1).padStart(4, '0')}`;

    const solicitud = await this.prisma.solicitud.create({
      data: {
        code,
        title: dto.title,
        description: dto.description,
        category: dto.category as any,
        priority: (dto.priority as any) || RequestPriority.MEDIA,
        status: RequestStatus.REGISTRADA,
        requesterId: user.id,
        requesterArea: user.area,
        justification: dto.justification || null,
      },
      include: {
        requester: true,
        assignedAnalyst: true,
        histories: {
          include: { author: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await this.prisma.solicitudHistory.create({
      data: {
        solicitudId: solicitud.id,
        authorId: user.id,
        previousStatus: null,
        newStatus: RequestStatus.REGISTRADA,
        comment: 'Solicitud registrada por el usuario solicitante.',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: AuditAction.REQUEST_CREATED,
        details: `Creación de la solicitud ${solicitud.code} - ${solicitud.title}`,
      },
    }).catch(() => {});

    return this.mapToItem(solicitud);
  }

  async findAll(user: UserSummary, query: QuerySolicitudesDto): Promise<SolicitudItem[]> {
    const where: any = {};

    // RBAC: El solicitante solo ve sus propias solicitudes
    if (user.role === Role.SOLICITANTE) {
      where.requesterId = user.id;
    } else if (user.role === Role.ANALISTA && query.assignedToMe) {
      where.assignedAnalystId = user.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.solicitud.findMany({
      where,
      include: {
        requester: true,
        assignedAnalyst: true,
        histories: {
          include: { author: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.mapToItem(item));
  }

  async findOne(id: string, user: UserSummary): Promise<SolicitudItem> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        requester: true,
        assignedAnalyst: true,
        histories: {
          include: { author: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // RBAC: El solicitante solo puede ver el detalle de sus propias solicitudes
    if (user.role === Role.SOLICITANTE && solicitud.requesterId !== user.id) {
      throw new ForbiddenException('No tiene permisos para ver esta solicitud');
    }

    return this.mapToItem(solicitud);
  }

  async updateStatus(
    id: string,
    dto: UpdateSolicitudStatusDto,
    user: UserSummary,
  ): Promise<SolicitudItem> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: { requester: true, assignedAnalyst: true },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    const currentStatus = solicitud.status as RequestStatus;
    const targetStatus = dto.status;

    // 1. Validar la matriz de transiciones RBAC según el rol
    const roleTransitions = ALLOWED_STATUS_TRANSITIONS[user.role as Role];
    const allowedTargets = roleTransitions ? roleTransitions[currentStatus] || [] : [];

    if (!allowedTargets.includes(targetStatus)) {
      throw new ForbiddenException(
        `Transición no permitida: Un usuario con rol ${user.role} no puede cambiar el estado de "${currentStatus}" a "${targetStatus}". ` +
        `Opciones válidas: [${allowedTargets.join(', ') || 'Ninguna'}]`,
      );
    }

    // 2. Si es analista y pasa a EN_ANALISIS, asignarse a sí mismo si no tiene analista
    let assignedAnalystId = solicitud.assignedAnalystId;
    if (user.role === Role.ANALISTA && targetStatus === RequestStatus.EN_ANALISIS) {
      assignedAnalystId = user.id;
    } else if (dto.assignedAnalystId && [Role.COORDINADOR, Role.ADMINISTRADOR].includes(user.role as Role)) {
      assignedAnalystId = dto.assignedAnalystId;
    }

    const isClosed = [RequestStatus.APROBADA, RequestStatus.RECHAZADA, RequestStatus.CANCELADA].includes(targetStatus);

    await this.prisma.solicitud.update({
      where: { id },
      data: {
        status: targetStatus as any,
        assignedAnalystId,
        estimatedHours: dto.estimatedHours !== undefined ? dto.estimatedHours : solicitud.estimatedHours,
        closedAt: isClosed ? new Date() : null,
      },
      include: {
        requester: true,
        assignedAnalyst: true,
        histories: {
          include: { author: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await this.prisma.solicitudHistory.create({
      data: {
        solicitudId: id,
        authorId: user.id,
        previousStatus: currentStatus as any,
        newStatus: targetStatus as any,
        comment: dto.comment || `Estado actualizado a ${targetStatus} por ${user.fullName} (${user.role})`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: AuditAction.REQUEST_STATUS_UPDATED,
        details: `Cambio de estado en ${solicitud.code}: ${currentStatus} -> ${targetStatus}.`,
      },
    }).catch(() => {});

    // Recargar con el historial completo
    return this.findOne(id, user);
  }

  async assignAnalyst(
    id: string,
    dto: AssignAnalystDto,
    user: UserSummary,
  ): Promise<SolicitudItem> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: { requester: true, assignedAnalyst: true },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    if (![Role.COORDINADOR, Role.ADMINISTRADOR].includes(user.role as Role)) {
      throw new ForbiddenException('Solo un Coordinador o Administrador puede asignar el encargado de una solicitud.');
    }

    const analyst = await this.prisma.user.findUnique({
      where: { id: dto.analystId },
    });

    if (!analyst) {
      throw new NotFoundException(`El analista/usuario con ID ${dto.analystId} no existe`);
    }

    if (analyst.role === ('SOLICITANTE' as any)) {
      throw new BadRequestException('Regla de asignación: No se puede asignar un requerimiento a un usuario con rol SOLICITANTE. Debe asignarse a un Analista, Coordinador o Administrador.');
    }

    if (!analyst.isActive) {
      throw new BadRequestException('El usuario seleccionado se encuentra inactivo en la plataforma.');
    }

    const currentStatus = solicitud.status as RequestStatus;
    // Si estaba registrada, pasa automáticamente a EN_ANALISIS al ser asignada
    const newStatus = currentStatus === RequestStatus.REGISTRADA ? RequestStatus.EN_ANALISIS : currentStatus;

    await this.prisma.solicitud.update({
      where: { id },
      data: {
        assignedAnalystId: analyst.id,
        status: newStatus as any,
      },
    });

    const comment = dto.comment?.trim()
      ? `Asignado a ${analyst.fullName} (${analyst.role}). Nota: ${dto.comment}`
      : `Asignado formalmente a ${analyst.fullName} (${analyst.role}) por ${user.fullName} (${user.role}).`;

    await this.prisma.solicitudHistory.create({
      data: {
        solicitudId: id,
        authorId: user.id,
        previousStatus: currentStatus as any,
        newStatus: newStatus as any,
        comment,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: AuditAction.REQUEST_STATUS_UPDATED,
        details: `Asignación de encargado en ${solicitud.code}: asignado a ${analyst.fullName} (${analyst.email}).`,
      },
    }).catch(() => {});

    return this.findOne(id, user);
  }

  async addComment(
    id: string,
    dto: AddCommentDto,
    user: UserSummary,
  ): Promise<SolicitudItem> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    if (user.role === Role.SOLICITANTE && solicitud.requesterId !== user.id) {
      throw new ForbiddenException('No tiene permisos para comentar en esta solicitud');
    }

    await this.prisma.solicitudHistory.create({
      data: {
        solicitudId: id,
        authorId: user.id,
        previousStatus: solicitud.status,
        newStatus: solicitud.status,
        comment: dto.comment.trim(),
      },
    });

    return this.findOne(id, user);
  }

  private mapToItem(raw: any): SolicitudItem {
    return {
      id: raw.id,
      code: raw.code,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      priority: raw.priority,
      status: raw.status,
      requesterId: raw.requesterId,
      requesterName: raw.requester?.fullName || 'Desconocido',
      requesterArea: raw.requesterArea || raw.requester?.area || 'N/A',
      justification: raw.justification || null,
      assignedAnalystId: raw.assignedAnalystId,
      assignedAnalystName: raw.assignedAnalyst?.fullName || null,
      estimatedHours: raw.estimatedHours,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      closedAt: raw.closedAt ? raw.closedAt.toISOString() : null,
      history: raw.histories?.map((h: any) => ({
        id: h.id,
        solicitudId: h.solicitudId,
        authorId: h.authorId,
        authorName: h.author?.fullName || 'Usuario',
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        comment: h.comment,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }
}
