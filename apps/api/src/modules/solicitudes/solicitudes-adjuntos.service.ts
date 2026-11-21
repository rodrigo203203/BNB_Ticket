import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestStatus, Role, SolicitudAdjuntoItem, UserSummary } from '@bnb/shared';
import {
  ADJUNTO_MAX_POR_SOLICITUD,
  validarAdjuntoSolicitud,
} from '../../common/utils/solicitud-adjunto.util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class SolicitudesAdjuntosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getUploadsRoot(): string {
    const rel = this.configService.get<string>('STORAGE_LOCAL_PATH', '../../storage/uploads');
    return path.resolve(process.cwd(), rel);
  }

  private async assertCanReadSolicitud(solicitudId: string, user: UserSummary) {
    const solicitud = await this.prisma.solicitud.findUnique({ where: { id: solicitudId } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (user.role === Role.SOLICITANTE && solicitud.requesterId !== user.id) {
      throw new ForbiddenException('Sin permiso para ver esta solicitud');
    }
    return solicitud;
  }

  async listar(solicitudId: string, user: UserSummary): Promise<SolicitudAdjuntoItem[]> {
    await this.assertCanReadSolicitud(solicitudId, user);
    const rows = await this.prisma.solicitudAdjunto.findMany({
      where: { solicitudId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      solicitudId: r.solicitudId,
      originalName: r.originalName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      uploadedById: r.uploadedById,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async subir(
    solicitudId: string,
    file: Express.Multer.File,
    user: UserSummary,
  ): Promise<SolicitudAdjuntoItem> {
    const solicitud = await this.assertCanReadSolicitud(solicitudId, user);
    if (solicitud.requesterId !== user.id) {
      throw new ForbiddenException('Solo el solicitante creador puede adjuntar archivos');
    }

    const count = await this.prisma.solicitudAdjunto.count({ where: { solicitudId } });
    if (count >= ADJUNTO_MAX_POR_SOLICITUD) {
      throw new BadRequestException(`Máximo ${ADJUNTO_MAX_POR_SOLICITUD} adjuntos por solicitud`);
    }

    let meta: { mime: string; ext: string; safeName: string };
    try {
      meta = validarAdjuntoSolicitud(file.buffer, file.originalname, file.mimetype);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const fileId = randomUUID();
    const relPath = path.join('solicitudes', solicitudId, `${fileId}.${meta.ext}`);
    const absPath = path.join(this.getUploadsRoot(), relPath);
    const absDir = path.dirname(absPath);
    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(absPath, file.buffer);

    const row = await this.prisma.solicitudAdjunto.create({
      data: {
        solicitudId,
        storedPath: relPath.replace(/\\/g, '/'),
        originalName: meta.safeName,
        mimeType: meta.mime,
        sizeBytes: file.buffer.length,
        uploadedById: user.id,
      },
    });

    await this.prisma.solicitudHistory.create({
      data: {
        solicitudId,
        authorId: user.id,
        previousStatus: solicitud.status,
        newStatus: solicitud.status,
        comment: `Archivo adjuntado: ${meta.safeName}`,
      },
    });

    return {
      id: row.id,
      solicitudId: row.solicitudId,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedById: row.uploadedById,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async resolverDescarga(adjuntoId: string, user: UserSummary) {
    const adj = await this.prisma.solicitudAdjunto.findUnique({ where: { id: adjuntoId } });
    if (!adj) throw new NotFoundException('Adjunto no encontrado');
    await this.assertCanReadSolicitud(adj.solicitudId, user);

    const root = this.getUploadsRoot();
    const abs = path.resolve(root, adj.storedPath);
    if (!abs.startsWith(root)) {
      throw new ForbiddenException('Ruta de archivo inválida');
    }
    const buffer = await fs.readFile(abs);
    return { adj, buffer };
  }

  async eliminar(adjuntoId: string, user: UserSummary): Promise<void> {
    const adj = await this.prisma.solicitudAdjunto.findUnique({ where: { id: adjuntoId } });
    if (!adj) throw new NotFoundException('Adjunto no encontrado');
    const solicitud = await this.assertCanReadSolicitud(adj.solicitudId, user);
    if (solicitud.requesterId !== user.id) {
      throw new ForbiddenException('Solo el solicitante puede eliminar adjuntos');
    }
    if (solicitud.status !== RequestStatus.REGISTRADA) {
      throw new ForbiddenException('Solo se pueden eliminar adjuntos mientras la solicitud está REGISTRADA');
    }

    const root = this.getUploadsRoot();
    const abs = path.resolve(root, adj.storedPath);
    if (abs.startsWith(root)) {
      await fs.unlink(abs).catch(() => undefined);
    }
    await this.prisma.solicitudAdjunto.delete({ where: { id: adjuntoId } });

    await this.prisma.solicitudHistory.create({
      data: {
        solicitudId: adj.solicitudId,
        authorId: user.id,
        previousStatus: solicitud.status,
        newStatus: solicitud.status,
        comment: `Adjunto eliminado: ${adj.originalName}`,
      },
    });
  }
}