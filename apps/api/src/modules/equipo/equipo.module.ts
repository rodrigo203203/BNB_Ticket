import { Module } from '@nestjs/common';
import { EquipoController } from './equipo.controller';
import { EquipoCargaService } from './equipo-carga.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EquipoController],
  providers: [EquipoCargaService],
  exports: [EquipoCargaService],
})
export class EquipoModule {}