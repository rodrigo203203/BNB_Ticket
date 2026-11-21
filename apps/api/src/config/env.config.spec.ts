import { validateEnvironment } from './env.config';
import { VALORES_DEV_POR_DEFECTO } from './secretos-entorno.util';

describe('validateEnvironment (claves Nest)', () => {
  const secretosDev = {
    JWT_ACCESS_SECRET: VALORES_DEV_POR_DEFECTO.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: VALORES_DEV_POR_DEFECTO.JWT_REFRESH_SECRET,
    SESSION_COOKIE_SECRET: VALORES_DEV_POR_DEFECTO.SESSION_COOKIE_SECRET,
    CSRF_SECRET: VALORES_DEV_POR_DEFECTO.CSRF_SECRET,
  };

  it('expone JWT_ACCESS_SECRET y jwtAccessSecret tras validar', () => {
    const cfg = validateEnvironment({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://u:p@localhost/db',
      ...secretosDev,
    });
    expect(cfg.JWT_ACCESS_SECRET).toBe(secretosDev.JWT_ACCESS_SECRET);
    expect(cfg.jwtAccessSecret).toBe(secretosDev.JWT_ACCESS_SECRET);
    expect(cfg.DATABASE_URL).toBe('postgresql://u:p@localhost/db');
    expect(cfg.databaseUrl).toBe('postgresql://u:p@localhost/db');
  });

  it('PORT y THROTTLE_TTL accesibles en mayúsculas', () => {
    const cfg = validateEnvironment({
      NODE_ENV: 'development',
      PORT: '3005',
      THROTTLE_TTL: '90',
      ...secretosDev,
    });
    expect(cfg.PORT).toBe('3005');
    expect(cfg.port).toBe(3005);
    expect(cfg.THROTTLE_TTL).toBe('90');
    expect(cfg.throttleTtl).toBe(90);
  });
});