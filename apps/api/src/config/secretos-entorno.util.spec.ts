import {
  VALORES_DEV_POR_DEFECTO,
  validarYResolverSecretos,
} from './secretos-entorno.util';

describe('validarYResolverSecretos', () => {
  const avisos: string[] = [];
  const capturar = (m: string) => avisos.push(m);

  beforeEach(() => {
    avisos.length = 0;
    for (const k of Object.keys(VALORES_DEV_POR_DEFECTO)) {
      delete process.env[k];
    }
  });

  it('en desarrollo usa default y emite aviso si falta JWT_ACCESS_SECRET', () => {
    const r = validarYResolverSecretos({ NODE_ENV: 'development' }, capturar);
    expect(r.JWT_ACCESS_SECRET).toBe(VALORES_DEV_POR_DEFECTO.JWT_ACCESS_SECRET);
    expect(avisos.some((a) => a.includes('JWT_ACCESS_SECRET'))).toBe(true);
    expect(avisos.some((a) => a.includes('INSEGURO'))).toBe(true);
  });

  it('en desarrollo acepta valores presentes', () => {
    const r = validarYResolverSecretos(
      {
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'mi_secreto_largo_suficiente_para_tests_12345',
        JWT_REFRESH_SECRET: 'refresh_ok_refresh_ok_refresh_ok_12',
        SESSION_COOKIE_SECRET: 'cookie_ok_cookie_ok_cookie_ok_1234',
        CSRF_SECRET: 'csrf_ok_csrf_ok_csrf_ok_csrf_ok_123',
      },
      capturar,
    );
    expect(r.JWT_ACCESS_SECRET).toBe('mi_secreto_largo_suficiente_para_tests_12345');
    expect(avisos).toHaveLength(0);
  });

  it('en producción rechaza secretos faltantes', () => {
    expect(() =>
      validarYResolverSecretos(
        { NODE_ENV: 'production', DATABASE_URL: 'postgresql://x/y' },
        capturar,
      ),
    ).toThrow(/No se puede iniciar la API en producción/);
    expect(() =>
      validarYResolverSecretos(
        { NODE_ENV: 'production', DATABASE_URL: 'postgresql://x/y' },
        capturar,
      ),
    ).toThrow(/Variables faltantes o vacías/);
  });

  it('en producción rechaza valor por defecto de desarrollo', () => {
    expect(() =>
      validarYResolverSecretos(
        {
          NODE_ENV: 'production',
          JWT_ACCESS_SECRET: VALORES_DEV_POR_DEFECTO.JWT_ACCESS_SECRET,
          JWT_REFRESH_SECRET: 'r1',
          SESSION_COOKIE_SECRET: 's1',
          CSRF_SECRET: 'c1',
        },
        capturar,
      ),
    ).toThrow(/valores por defecto de desarrollo/);
  });

  it('en producción acepta secretos propios', () => {
    const r = validarYResolverSecretos(
      {
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'prod_access_prod_access_prod_access_12',
        JWT_REFRESH_SECRET: 'prod_refresh_prod_refresh_prod_refresh_1',
        SESSION_COOKIE_SECRET: 'prod_cookie_prod_cookie_prod_cookie_12',
        CSRF_SECRET: 'prod_csrf_prod_csrf_prod_csrf_prod_csrf_12',
      },
      capturar,
    );
    expect(r.JWT_ACCESS_SECRET).toBe('prod_access_prod_access_prod_access_12');
  });
});