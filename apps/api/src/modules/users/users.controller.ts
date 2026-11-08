import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, UserSummary } from '@bnb/shared';

@ApiTags('Administración de Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar todos los usuarios del sistema (solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Listado de usuarios' })
  async findAll(
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ): Promise<UserSummary[]> {
    return this.usersService.findAll(search, role);
  }

  @Get('assignable')
  @Roles(Role.ADMINISTRADOR, Role.COORDINADOR, Role.ANALISTA)
  @ApiOperation({
    summary: 'Listar usuarios asignables como encargados de tickets (todos excepto rol SOLICITANTE)',
  })
  @ApiResponse({ status: 200, description: 'Listado de analistas/coordinadores/administradores asignables' })
  async findAssignable(): Promise<Array<{ id: string; fullName: string; email: string; role: Role; area: string }>> {
    return this.usersService.findAssignableAnalysts();
  }

  @Post()
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear un nuevo usuario con contraseña segura (solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() admin: UserSummary,
  ): Promise<UserSummary> {
    return this.usersService.create(dto, admin);
  }

  @Patch(':id/status')
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar/desactivar o desbloquear cuenta de usuario (solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Estado de usuario actualizado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: UserSummary,
  ): Promise<UserSummary> {
    return this.usersService.updateStatus(id, dto, admin);
  }

  @Get(':id')
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener detalle de un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de usuario' })
  async findOne(@Param('id') id: string): Promise<UserSummary> {
    return this.usersService.findOne(id);
  }
}

