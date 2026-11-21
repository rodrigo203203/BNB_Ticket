/**
 * GET /api/v1/dashboard/analisis vía HTTP (cookies de sesión).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

import { contrasenaLoginIntegracion, hayBaseDeDatosParaTests } from './helpers/hay-base';

const runIntegration = hayBaseDeDatosParaTests();

(runIntegration ? describe : describe.skip)('GET /dashboard/analisis (HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const password = contrasenaLoginIntegracion() || 'DemoBNB2026!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  async function sessionCookie(email: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.getSetCookie?.() ?? [];
    return setCookie.map((c) => c.split(';')[0]).join('; ');
  }

  async function getAnalisis(cookie: string, query: string) {
    return fetch(`${baseUrl}/api/v1/dashboard/analisis?${query}`, {
      headers: { Cookie: cookie },
    });
  }

  it('coordinador y analista responden 200 con periodo y área', async () => {
    const coordCookie = await sessionCookie('coordinador@bnb.com.bo');
    const bootstrap = await getAnalisis(coordCookie, 'period=30d');
    const bootJson = (await bootstrap.json()) as {
      data: { areasDisponibles: string[] };
    };
    const areaQ = bootJson.data.areasDisponibles[0]
      ? `period=30d&area=${encodeURIComponent(bootJson.data.areasDisponibles[0])}`
      : 'period=30d';
    for (const q of ['period=30d', 'period=7d', areaQ]) {
      const res = await getAnalisis(coordCookie, q);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { success: boolean; data: { resumen: unknown } };
      expect(json.success).toBe(true);
      expect(json.data.resumen).toBeDefined();
    }

    const anaCookie = await sessionCookie('analista@bnb.com.bo');
    const anaRes = await getAnalisis(anaCookie, 'period=90d');
    expect(anaRes.status).toBe(200);
  }, 30_000);
});