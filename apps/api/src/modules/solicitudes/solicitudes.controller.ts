import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudStatusDto } from './dto/update-status.dto';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { AssignAnalystDto } from './dto/assign-analyst.dto';
import { AddCommentDto } from './dto/add-comment.dto';
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
  constructor(private readonly solicitudesService: SolicitudesService) {}

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
