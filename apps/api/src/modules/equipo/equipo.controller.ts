import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSummary } from '@bnb/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EquipoCargaService } from './equipo-carga.service';

@ApiTags('equipo')
@ApiBearerAuth()
@Controller('equipo')
@UseGuards(JwtAuthGuard)
export class EquipoController {
  constructor(private readonly equipoCargaService: EquipoCargaService) {}

  @Get('carga')
  @ApiOperation({
    summary: 'Carga del equipo (boceto 04): coord/admin ven todos; analista solo su fila',
  })
  obtenerCarga(@CurrentUser() user: UserSummary) {
    return this.equipoCargaService.obtenerCargaEquipo(user);
  }
}