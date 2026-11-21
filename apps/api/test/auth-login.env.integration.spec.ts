/**
 * Login HTTP: secretos vía process.env / validate (sin escribir DATABASE_URL por defecto en process.env).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, ConfigModule } from '@nestjs/config';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { validateEnvironment } from '../src/config/env.config';
import { VALORES_DEV_POR_DEFECTO } from '../src/config/secretos-entorno.util';
import { hayBaseDeDatosParaTests, urlBaseDeDatosInicial } from './helpers/hay-base';

const CLAVES_SENSIBLES = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_COOKIE_SECRET',
  'CSRF_SECRET',
  'DATABASE_URL',
  'THROTTLE_TTL',
] as const;

const runWithDb = hayBaseDeDatosParaTests();
const dbUrlInicial = urlBaseDeDatosInicial();

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
  let backup: Record<string, string | undefined>;

  afterEach(async () => {
    await moduleRef?.close();
    restaurarClaves(backup);
  });

  it('JWT_ACCESS_SECRET y THROTTLE_TTL tras validate sin DATABASE_URL en process.env', async () => {
    backup = guardarYVaciarClaves();
    const jwtSoloArchivo = 'test_jwt_access_secret_loaded_from_temp_env_40chars!!';
    process.env.NODE_ENV = 'development';
    process.env.JWT_ACCESS_SECRET = jwtSoloArchivo;
    process.env.JWT_REFRESH_SECRET = VALORES_DEV_POR_DEFECTO.JWT_REFRESH_SECRET;
    process.env.SESSION_COOKIE_SECRET = VALORES_DEV_POR_DEFECTO.SESSION_COOKIE_SECRET;
    process.env.CSRF_SECRET = VALORES_DEV_POR_DEFECTO.CSRF_SECRET;
    process.env.THROTTLE_TTL = '42';

    expect(process.env.DATABASE_URL).toBeUndefined();

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
    expect(config.get<string>('JWT_ACCESS_SECRET')).toBe(jwtSoloArchivo);
    expect(config.get<string>('jwtAccessSecret')).toBe(jwtSoloArchivo);
    expect(Number(config.get('THROTTLE_TTL'))).toBe(42);
    expect(config.get<string>('databaseUrl')).toContain('postgresql://');
    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});

(runWithDb ? describe : describe.skip)('POST /auth/login (supertest, solo .env)', () => {
  let app: INestApplication;
  let backup: Record<string, string | undefined>;

  beforeAll(async () => {
    backup = guardarYVaciarClaves();
    process.env.NODE_ENV = 'development';
    if (dbUrlInicial) process.env.DATABASE_URL = dbUrlInicial;
    process.env.JWT_ACCESS_SECRET = VALORES_DEV_POR_DEFECTO.JWT_ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = VALORES_DEV_POR_DEFECTO.JWT_REFRESH_SECRET;
    process.env.SESSION_COOKIE_SECRET = VALORES_DEV_POR_DEFECTO.SESSION_COOKIE_SECRET;
    process.env.CSRF_SECRET = VALORES_DEV_POR_DEFECTO.CSRF_SECRET;

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