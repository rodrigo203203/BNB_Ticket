/**
 * Login HTTP: secretos y DATABASE_URL solo vía archivo .env temporal (sin depender de export manual).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import dotenv from 'dotenv';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { validateEnvironment } from '../src/config/env.config';
import { VALORES_DEV_POR_DEFECTO } from '../src/config/secretos-entorno.util';

const CLAVES_SENSIBLES = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_COOKIE_SECRET',
  'CSRF_SECRET',
  'DATABASE_URL',
] as const;

const dbUrl = process.env.DATABASE_URL;
const runWithDb = Boolean(dbUrl);

function guardarYVaciarClaves(): Record<string, string | undefined> {
  const backup: Record<string, string | undefined> = {};
  for (const k of CLAVES_SENSIBLES) {
    backup[k] = process.env[k];
    delete process.env[k];
  }
  return backup;
}

function restaurarClaves(backup: Record<string, string | undefined>): void {
  for (const k of CLAVES_SENSIBLES) {
    if (backup[k] === undefined) delete process.env[k];
    else process.env[k] = backup[k];
  }
}

describe('ConfigService claves MAYÚSCULAS sin export previo', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('JWT_ACCESS_SECRET y THROTTLE_TTL tras validate y dotenv temporal', async () => {
    const backup = guardarYVaciarClaves();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bnb-login-env-'));
    const envPath = path.join(dir, '.env');
    const jwtSoloArchivo = 'test_jwt_access_secret_loaded_from_temp_env_40chars!!';
    fs.writeFileSync(
      envPath,
      [
        'NODE_ENV=development',
        `DATABASE_URL=${dbUrl || 'postgresql://u:p@127.0.0.1:5432/x'}`,
        `JWT_ACCESS_SECRET=${jwtSoloArchivo}`,
        `JWT_REFRESH_SECRET=${VALORES_DEV_POR_DEFECTO.JWT_REFRESH_SECRET}`,
        `SESSION_COOKIE_SECRET=${VALORES_DEV_POR_DEFECTO.SESSION_COOKIE_SECRET}`,
        `CSRF_SECRET=${VALORES_DEV_POR_DEFECTO.CSRF_SECRET}`,
        'THROTTLE_TTL=42',
      ].join('\n'),
      'utf8',
    );

    dotenv.config({ path: envPath, override: true });
    process.env.JWT_ACCESS_SECRET = jwtSoloArchivo;
    process.env.THROTTLE_TTL = '42';
    expect(process.env.JWT_ACCESS_SECRET).toBe(jwtSoloArchivo);

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnvironment,
        }),
      ],
    }).compile();
    const config = moduleRef.get(ConfigService);
    expect(config.get<string>('JWT_ACCESS_SECRET')).toBe(process.env.JWT_ACCESS_SECRET);
    expect(config.get<string>('jwtAccessSecret')).toBe(process.env.JWT_ACCESS_SECRET);
    expect(Number(config.get('THROTTLE_TTL'))).toBe(42);

    restaurarClaves(backup);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

(runWithDb ? describe : describe.skip)('POST /auth/login (supertest, solo .env)', () => {
  let app: INestApplication;
  let backup: Record<string, string | undefined>;

  beforeAll(async () => {
    backup = guardarYVaciarClaves();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bnb-login-http-'));
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      [
        'NODE_ENV=development',
        `DATABASE_URL=${dbUrl}`,
        `JWT_ACCESS_SECRET=${VALORES_DEV_POR_DEFECTO.JWT_ACCESS_SECRET}`,
        `JWT_REFRESH_SECRET=${VALORES_DEV_POR_DEFECTO.JWT_REFRESH_SECRET}`,
        `SESSION_COOKIE_SECRET=${VALORES_DEV_POR_DEFECTO.SESSION_COOKIE_SECRET}`,
        `CSRF_SECRET=${VALORES_DEV_POR_DEFECTO.CSRF_SECRET}`,
      ].join('\n'),
      'utf8',
    );
    dotenv.config({ path: envPath, override: true });

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
  }, 90_000);

  afterAll(async () => {
    await app?.close();
    restaurarClaves(backup);
  });

  it('login admin@bnb.com.bo responde 200 y cookie de sesión', async () => {
    const password = process.env.DEMO_SEED_PASSWORD || 'DemoBNB2026!';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@bnb.com.bo', password })
      .expect(200);
    expect(res.body?.data?.user?.email).toBe('admin@bnb.com.bo');
    const cookies = res.headers['set-cookie'];
    expect(cookies?.length).toBeGreaterThan(0);
  });
});