import { ForbiddenException } from '@nestjs/common';
import { Role } from '@bnb/shared';
import { EquipoCargaService } from '../src/modules/equipo/equipo-carga.service';

describe('EquipoCargaService RBAC', () => {
  const prisma = {} as any;
  const service = new EquipoCargaService(prisma);

  it('solicitante recibe 403', async () => {
    await expect(
      service.obtenerCargaEquipo({
        id: 's1',
        role: Role.SOLICITANTE,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});