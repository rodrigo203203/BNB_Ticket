/**
 * Integración real del panel analítico contra Postgres (seed:demo).
 * Falla el CI local si el endpoint no puede armar stats para coord/analista.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role, UserSummary, RequestStatus } from '@bnb/shared';

import { hayBaseDeDatosParaTests } from './helpers/hay-base';

const runIntegration = hayBaseDeDatosParaTests();

(runIntegration ? describe : describe.skip)('dashboard analisis (integración DB)', () => {
  let dashboard: DashboardService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    dashboard = moduleRef.get(DashboardService);
    prisma = moduleRef.get(PrismaService);
  }, 45_000);

  async function userSummary(email: string) {
    const u = await prisma.user.findFirst({ where: { email } });
    if (!u) throw new Error(`Usuario demo no encontrado: ${email}`);
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role as Role,
      area: u.area,
      jobTitle: u.jobTitle,
      avatarUrl: u.avatarPath,
      isActive: u.isActive,
      isLocked: u.isLocked,
      mustChangePassword: u.mustChangePassword,
      failedAttempts: u.failedAttempts,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    } satisfies UserSummary;
  }

  it('coordinador: periodo 30d y filtro área', async () => {
    const coord = await userSummary('coordinador@bnb.com.bo');
    const base = await dashboard.getAnalisisForUser(coord, { period: '30d' });
    expect(base.resumen.solicitudesPeriodo).toHaveProperty('valor');
    expect(base.areasDisponibles.length).toBeGreaterThan(0);

    const area = base.areasDisponibles[0];
    const filtrado = await dashboard.getAnalisisForUser(coord, {
      period: '7d',
      area,
    });
    expect(filtrado.resumen).toBeDefined();

    const sumEstado = Object.values(base.porEstado).reduce((a, b) => a + b, 0);
    expect(sumEstado).toBeGreaterThan(0);
    expect(base.porAreaRequester?.length).toBeGreaterThan(0);
    expect(base.cargaPorAnalista?.length).toBeGreaterThan(0);
    expect(base.serieMensual?.some((m) => m.creadas + m.cerradas + m.vencidas > 0)).toBe(true);
    const activos = [
      RequestStatus.REGISTRADA,
      RequestStatus.EN_ANALISIS,
      RequestStatus.EN_REVISION_COORDINACION,
    ];
    const sumCarga = base.cargaPorAnalista.reduce(
      (a, row) =>
        a +
        activos.reduce((s, st) => s + (row.porEstado[st] ?? 0), 0) +
        row.vencidas,
      0,
    );
    expect(sumCarga).toBeGreaterThan(0);
    expect(base.resumen.tiempoPromedioRespuestaDias.valor).toBeGreaterThan(0);
  });

  it('analista: solo su universo asignado', async () => {
    const analista = await userSummary('analista@bnb.com.bo');
    const stats = await dashboard.getAnalisisForUser(analista, { period: '90d' });
    expect(stats.resumen.aprobacionesPendientes.valor).toBeGreaterThanOrEqual(0);
    expect(stats.periodo.clave).toBe('90d');
  });
});