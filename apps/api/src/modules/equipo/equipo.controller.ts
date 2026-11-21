import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, UserSummary } from '@bnb/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EquipoCargaService } from './equipo-carga.service';

@ApiTags('equipo')
@ApiBearerAuth()
@Controller('equipo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipoController {
  constructor(private readonly equipoCargaService: EquipoCargaService) {}

  @Get('carga')
  @Roles(Role.ANALISTA, Role.COORDINADOR, Role.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Carga del equipo: coordinador/admin ven todo; analista solo su fila (Spark M11)',
  })
  obtenerCarga(@CurrentUser() user: UserSummary) {
    return this.equipoCargaService.obtenerCargaEquipo(user);
  }
}