import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
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

  @Get('import/template')
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Descargar plantilla CSV para importación masiva' })
  async downloadTemplate(@Res() res: Response) {
    const csv = this.usersService.getImportTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-usuarios-bnb.csv"');
    res.send(csv);
  }

  @Post('import/preview')
  @Roles(Role.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Vista previa y validación del CSV de usuarios' })
  async previewImport(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Debe adjuntar un archivo CSV en el campo file');
    }
    return this.usersService.previewCsvImport(file.buffer);
  }

  @Post('import')
  @Roles(Role.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Importar usuarios (transacción única; devuelve CSV con claves temporales)' })
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() admin: UserSummary,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Debe adjuntar un archivo CSV en el campo file');
    }
    return this.usersService.importUsersFromCsv(file.buffer, admin);
  }

  @Get('assignable')
  @Roles(Role.ADMINISTRADOR, Role.COORDINADOR, Role.ANALISTA)
  @ApiOperation({
    summary: 'Listar usuarios asignables como encargados de tickets (todos excepto rol SOLICITANTE)',
  })
  @ApiResponse({ status: 200, description: 'Listado de analistas/coordinadores/administradores asignables' })
  async findAssignable() {
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

