import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  cargarEntorno,
  reiniciarEstadoCargaEntornoParaTests,
} from './cargar-entorno';
import { listarArchivosEnvEnOrden } from './rutas-entorno.util';

describe('cargarEntorno', () => {
  const envOriginales: Record<string, string | undefined> = {};
  const keysSnapshot = ['DATABASE_URL', 'PORT', 'ENV_TEST_CLAVE'];

  beforeEach(() => {
    reiniciarEstadoCargaEntornoParaTests();
    for (const k of keysSnapshot) {
      envOriginales[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keysSnapshot) {
      if (envOriginales[k] === undefined) delete process.env[k];
      else process.env[k] = envOriginales[k];
    }
    reiniciarEstadoCargaEntornoParaTests();
  });

  it('el .env gana sobre variables del sistema (override)', () => {
    process.env.PORT = '1111';
    process.env.ENV_TEST_CLAVE = 'desde-sistema';

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bnb-env-'));
    const raizMonorepo = tmp;
    const raizApi = path.join(tmp, 'apps', 'api');
    fs.mkdirSync(path.join(raizApi, 'prisma'), { recursive: true });
    fs.writeFileSync(path.join(raizApi, 'prisma', 'schema.prisma'), '// test');
    fs.writeFileSync(
      path.join(raizMonorepo, '.env'),
      'PORT=3005\nENV_TEST_CLAVE=desde-raiz\nDATABASE_URL=postgresql://raiz/db\n',
    );

    cargarEntorno(path.join(raizApi, 'src', 'config'));

    expect(process.env.PORT).toBe('3005');
    expect(process.env.ENV_TEST_CLAVE).toBe('desde-raiz');
    expect(process.env.DATABASE_URL).toBe('postgresql://raiz/db');
  });

  it('apps/api/.env gana sobre el .env de la raíz', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bnb-env-'));
    const raizApi = path.join(tmp, 'apps', 'api');
    fs.mkdirSync(path.join(raizApi, 'prisma'), { recursive: true });
    fs.writeFileSync(path.join(raizApi, 'prisma', 'schema.prisma'), '// test');
    fs.writeFileSync(path.join(tmp, '.env'), 'DATABASE_URL=postgresql://raiz/db\nPORT=3000\n');
    fs.writeFileSync(path.join(raizApi, '.env'), 'DATABASE_URL=postgresql://api/db\nPORT=3005\n');

    cargarEntorno(path.join(raizApi, 'src', 'config'));

    expect(process.env.DATABASE_URL).toBe('postgresql://api/db');
    expect(process.env.PORT).toBe('3005');
  });

  it('tolera archivos ausentes', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bnb-env-'));
    const raizApi = path.join(tmp, 'apps', 'api');
    fs.mkdirSync(path.join(raizApi, 'prisma'), { recursive: true });
    fs.writeFileSync(path.join(raizApi, 'prisma', 'schema.prisma'), '// test');

    const orden = listarArchivosEnvEnOrden(tmp, raizApi);
    expect(orden.every((p) => p.endsWith('.env'))).toBe(true);

    const r = cargarEntorno(path.join(raizApi, 'src', 'config'));
    expect(r.archivosCargados).toEqual([]);
  });
});