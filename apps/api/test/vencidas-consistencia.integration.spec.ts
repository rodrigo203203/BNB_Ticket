/**
 * Spark B7: mismo conteo de vencidas en dashboard, Gantt, carga y assignables.
 */
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { SolicitudesService } from '../src/modules/solicitudes/solicitudes.service';
import { EquipoCargaService } from '../src/modules/equipo/equipo-carga.service';
import { UsersService } from '../src/modules/users/users.service';
import {
  esSolicitudVencida,
  RequestStatus,
  Role,
  UserSummary,
} from '@bnb/shared';

const run = Boolean(process.env.DATABASE_URL);

(run ? describe : describe.skip)('vencidas — consistencia entre endpoints (seed)', () => {
  let prisma: PrismaService;
  let dashboard: DashboardService;
  let solicitudes: SolicitudesService;
  let equipo: EquipoCargaService;
  let users: UsersService;
  let coord: UserSummary;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = mod.get(PrismaService);
    dashboard = mod.get(DashboardService);
    solicitudes = mod.get(SolicitudesService);
    equipo = mod.get(EquipoCargaService);
    users = mod.get(UsersService);
    const u = await prisma.user.findFirstOrThrow({ where: { email: 'coordinador@bnb.com.bo' } });
    coord = {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      jobTitle: u.jobTitle,
      avatarUrl: u.avatarPath,
      role: u.role as Role,
      area: u.area,
      isActive: u.isActive,
      isLocked: u.isLocked,
      mustChangePassword: u.mustChangePassword,
      failedAttempts: u.failedAttempts,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }, 45_000);

  it('conteo canónico vs dashboard, gantt, carga y assignables', async () => {
    const rows = await prisma.solicitud.findMany({
      select: {
        status: true,
        fechaRequerida: true,
        fechaEntrega: true,
        assignedAnalystId: true,
      },
    });
    const activos = [
      RequestStatus.REGISTRADA,
      RequestStatus.EN_ANALISIS,
      RequestStatus.EN_REVISION_COORDINACION,
    ];
    const canonical = rows.filter(
      (r) =>
        activos.includes(r.status as RequestStatus) &&
        esSolicitudVencida({
          status: r.status as RequestStatus,
          fechaRequerida: r.fechaRequerida,
          fechaEntrega: r.fechaEntrega,
        }),
    ).length;

    const analisis = await dashboard.getAnalisisForUser(coord, { period: '90d' });
    expect(analisis.resumen.vencidas.valor).toBe(canonical);

    const gantt = await solicitudes.findForGantt(coord, {});
    const ganttVencidas = gantt.filter((g) => g.vencida).length;
    expect(ganttVencidas).toBe(canonical);

    const carga = await equipo.obtenerCargaEquipo(coord);
    const asignadasVencidas = carga.personas.reduce((a, p) => a + p.vencidas, 0);
    const sinAsignarVencidas = rows.filter(
      (r) =>
        !r.assignedAnalystId &&
        activos.includes(r.status as RequestStatus) &&
        esSolicitudVencida({
          status: r.status as RequestStatus,
          fechaRequerida: r.fechaRequerida,
          fechaEntrega: r.fechaEntrega,
        }),
    ).length;
    expect(carga.resumen.vencidasTotales).toBe(asignadasVencidas);
    expect(asignadasVencidas + sinAsignarVencidas).toBe(canonical);

    const assignable = await users.findAssignableAnalysts();
    const rodrigo = assignable.find((a) => a.fullName.includes('Rodrigo'));
    expect(rodrigo).toBeDefined();
    const rodrigoId = await prisma.user.findFirst({ where: { fullName: { contains: 'Rodrigo' } } });
    const expectRodrigo = rows.filter(
      (r) =>
        r.assignedAnalystId === rodrigoId?.id &&
        activos.includes(r.status as RequestStatus) &&
        esSolicitudVencida({
          status: r.status as RequestStatus,
          fechaRequerida: r.fechaRequerida,
          fechaEntrega: r.fechaEntrega,
        }),
    ).length;
    expect(rodrigo!.vencidas).toBe(expectRodrigo);
  }, 30_000);
});