import { Module } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesAdjuntosService } from './solicitudes-adjuntos.service';
import { SolicitudesController } from './solicitudes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, SolicitudesAdjuntosService],
  exports: [SolicitudesService, SolicitudesAdjuntosService],
})
export class SolicitudesModule {}
