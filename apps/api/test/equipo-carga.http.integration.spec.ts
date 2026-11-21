/**
 * GET /api/v1/equipo/carga — M11: analista solo ve su fila (HTTP).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const runIntegration = Boolean(process.env.DATABASE_URL);

(runIntegration ? describe : describe.skip)('GET /equipo/carga (HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const password = process.env.DEMO_SEED_PASSWORD || 'DemoBNB2026!';

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

  it('analista: una sola fila aunque se envíen query params ajenos', async () => {
    const cookie = await sessionCookie('analista@bnb.com.bo');
    for (const q of [
      '',
      '?userId=otro&rol=COORDINADOR&area=Finanzas',
      '?encargado=rodrigo',
    ]) {
      const res = await fetch(`${baseUrl}/api/v1/equipo/carga${q}`, {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { data?: { personas: Array<{ email: string }>; resumen: { personas: number } } };
      const data = json.data;
      expect(data).toBeDefined();
      expect(data!.personas.length).toBe(1);
      expect(data!.resumen.personas).toBe(1);
      expect(data!.personas[0]!.email).toBe('analista@bnb.com.bo');
    }
  });
});