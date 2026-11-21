import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesAdjuntosService } from './solicitudes-adjuntos.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudStatusDto } from './dto/update-status.dto';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { AssignAnalystDto } from './dto/assign-analyst.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { UpdateFechaEntregaDto } from './dto/update-fecha-entrega.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, UserSummary } from '@bnb/shared';

@ApiTags('Solicitudes y Tickets (RBAC)')
@ApiBearerAuth()
@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly adjuntosService: SolicitudesAdjuntosService,
  ) {}

  @Post()
  @Roles(Role.SOLICITANTE, Role.ADMINISTRADOR, Role.COORDINADOR, Role.ANALISTA)
  @ApiOperation({ summary: 'Crea una nueva solicitud (Cualquier usuario autenticado)' })
  async create(
    @Body() dto: CreateSolicitudDto,
    @CurrentUser() user: UserSummary,
  ) {
    return this.solicitudesService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lista solicitudes según permisos del rol' })
  async findAll(
    @CurrentUser() user: UserSummary,
    @Query() query: QuerySolicitudesDto,
  ) {
    return this.solicitudesService.findAll(user, query);
  }

  @Get('gantt')
  @ApiOperation({ summary: 'Datos del diagrama Gantt (sin rol SOLICITANTE)' })
  async gantt(@CurrentUser() user: UserSummary) {
    return this.solicitudesService.findForGantt(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle y bitácora de una solicitud' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.solicitudesService.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualiza el estado de una solicitud siguiendo matriz RBAC' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSolicitudStatusDto,
    @CurrentUser() user: UserSummary,
  ) {
    return this.solicitudesService.updateStatus(id, dto, user);
  }

  @Patch(':id/assign')
  @Roles(Role.COORDINADOR, Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Asigna un analista o encargado al ticket (excepto rol SOLICITANTE)' })
  async assignAnalyst(
    @Param('id') id: string,
    @Body() dto: AssignAnalystDto,
    @CurrentUser() user: UserSummary,
  ) {
    return this.solicitudesService.assignAnalyst(id, dto, user);
  }

  @Patch(':id/fecha-entrega')
  @Roles(Role.ANALISTA, Role.COORDINADOR, Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualiza la fecha de entrega (analista asignado, coordinador o admin)' })
  async updateFechaEntrega(
    @Param('id') id: string,
    @Body() dto: UpdateFechaEntregaDto,
    @CurrentUser() user: UserSummary,
  ) {
    return this.solicitudesService.updateFechaEntrega(id, dto, user);
  }

  @Get(':id/adjuntos')
  @ApiOperation({ summary: 'Lista adjuntos de la solicitud' })
  async listarAdjuntos(@Param('id') id: string, @CurrentUser() user: UserSummary) {
    return this.adjuntosService.listar(id, user);
  }

  @Post(':id/adjuntos')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Sube un adjunto (solo solicitante creador)' })
  async subirAdjunto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserSummary,
  ) {
    return this.adjuntosService.subir(id, file, user);
  }

  @Get(':id/adjuntos/:adjuntoId/descarga')
  async descargarAdjunto(
    @Param('adjuntoId') adjuntoId: string,
    @CurrentUser() user: UserSummary,
    @Res() res: Response,
  ) {
    const { adj, buffer } = await this.adjuntosService.resolverDescarga(adjuntoId, user);
    res.setHeader('Content-Type', adj.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${adj.originalName}"`);
    res.send(buffer);
  }

  @Delete(':id/adjuntos/:adjuntoId')
  @ApiOperation({ summary: 'Elimina adjunto (solicitante, estado REGISTRADA)' })
  async eliminarAdjunto(
    @Param('adjuntoId') adjuntoId: string,
    @CurrentUser() user: UserSummary,
  ) {
    await this.adjuntosService.eliminar(adjuntoId, user);
    return { message: 'Adjunto eliminado' };
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Agrega un comentario o avance al historial de la solicitud' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: UserSummary,
  ) {
    return this.solicitudesService.addComment(id, dto, user);
  }
}
