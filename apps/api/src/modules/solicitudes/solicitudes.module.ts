import { Module } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesAdjuntosService } from './solicitudes-adjuntos.service';
import { SolicitudesController } from './solicitudes.controller';
import { AuthModule } from '../auth/auth.module';
import { EquipoModule } from '../equipo/equipo.module';

@Module({
  imports: [AuthModule, EquipoModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, SolicitudesAdjuntosService],
  exports: [SolicitudesService, SolicitudesAdjuntosService],
})
export class SolicitudesModule {}
