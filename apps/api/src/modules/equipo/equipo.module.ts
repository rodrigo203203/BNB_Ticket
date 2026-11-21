import { Module } from '@nestjs/common';
import { EquipoController } from './equipo.controller';
import { EquipoCargaService } from './equipo-carga.service';

@Module({
  controllers: [EquipoController],
  providers: [EquipoCargaService],
  exports: [EquipoCargaService],
})
export class EquipoModule {}