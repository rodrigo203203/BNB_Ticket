import { BadRequestException } from '@nestjs/common';
import { Role, RequestStatus } from '@bnb/shared';
import { SolicitudesService } from '../src/modules/solicitudes/solicitudes.service';
import { EquipoCargaService } from '../src/modules/equipo/equipo-carga.service';

describe('assign analyst — motivo con carga ALTA', () => {
  const equipoCarga = {
    calcularCargaUsuarioId: jest.fn().mockResolvedValue({
      nivel: 'alta',
      puntosCarga: 28,
      activas: 9,
      vencidas: 1,
      porVencer: 0,
      porEstado: {},
      proximaFechaEntrega: null,
      proximaSolicitudCodigo: null,
      proximaSolicitudId: null,
    }),
  } as unknown as EquipoCargaService;

  const prisma = {
    solicitud: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'sol-1',
        code: 'REQ-2026-0001',
        status: RequestStatus.REGISTRADA,
        assignedAnalyst: null,
      }),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        fullName: 'Ana',
        email: 'a@test',
        role: Role.ANALISTA,
        isActive: true,
      }),
    },
    solicitudHistory: { create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  } as any;

  const service = new SolicitudesService(prisma, equipoCarga);

  it('rechaza asignación sin motivo si carga es alta', async () => {
    await expect(
      service.assignAnalyst(
        'sol-1',
        { analystId: 'a1' },
        { id: 'c1', role: Role.COORDINADOR, fullName: 'Coord', email: 'c@test' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});