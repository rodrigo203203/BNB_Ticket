import { validarYResolverSecretos } from './secretos-entorno.util';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  appName: string;
  appUrl: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  sessionCookieSecret: string;
  jwtAccessExpiration: string;
  jwtRefreshExpiration: string;
  sessionTtlHours: number;
  maxFailedAttempts: number;
  lockoutMinutes: number;
  cookieName: string;
  cookieSecure: boolean;
  cookieSameSite: 'lax' | 'strict' | 'none';
  cookieDomain: string;
  csrfSecret: string;
  corsOrigin: string;
  throttleTtl: number;
  throttleLimit: number;
  throttleAuthLimit: number;
}

/** Nest reemplaza la config validada: debemos conservar claves SCREAMING_SNAKE y camelCase. */
function construirAppConfig(config: Record<string, unknown>): AppConfig {
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  const port = parseInt((config.PORT as string) || '3000', 10);
  const apiPrefix = (config.API_PREFIX as string) || 'api/v1';
  const appName = (config.APP_NAME as string) || 'BNB Gerencia de Datos - Gestión de Solicitudes';
  const appUrl = (config.APP_URL as string) || 'http://localhost:5173';
  const databaseUrlRaw = config.DATABASE_URL as string | undefined;
  const databaseUrl =
    databaseUrlRaw ||
    (nodeEnv === 'production'
      ? (() => {
          throw new Error('DATABASE_URL es obligatoria en NODE_ENV=production');
        })()
      : 'postgresql://postgres:postgres@localhost:5432/bnb_tickets_dev?schema=public');

  const secretos = validarYResolverSecretos(config);
  const jwtAccessSecret = secretos.JWT_ACCESS_SECRET;
  const jwtRefreshSecret = secretos.JWT_REFRESH_SECRET;
  const sessionCookieSecret = secretos.SESSION_COOKIE_SECRET;

  const jwtAccessExpiration = (config.JWT_ACCESS_EXPIRATION as string) || '15m';
  const jwtRefreshExpiration = (config.JWT_REFRESH_EXPIRATION as string) || '7d';
  const sessionTtlHours = parseInt((config.SESSION_TTL_HOURS as string) || '168', 10);

  const maxFailedAttempts = parseInt((config.MAX_FAILED_LOGIN_ATTEMPTS as string) || '5', 10);
  const lockoutMinutes = parseInt((config.LOCKOUT_DURATION_MINUTES as string) || '15', 10);

  const cookieName = (config.COOKIE_NAME as string) || 'bnb_session';
  const cookieSecure = config.COOKIE_SECURE === 'true' || config.NODE_ENV === 'production';
  const cookieSameSite = ((config.COOKIE_SAME_SITE as string) || 'lax') as 'lax' | 'strict' | 'none';
  const cookieDomain = (config.COOKIE_DOMAIN as string) || 'localhost';

  const csrfSecret = secretos.CSRF_SECRET;
  const corsOrigin = (config.CORS_ORIGIN as string) || 'http://localhost:5173';

  const throttleTtl = parseInt((config.THROTTLE_TTL as string) || '60', 10);
  const throttleLimit = parseInt((config.THROTTLE_LIMIT as string) || '100', 10);
  const throttleAuthLimit = parseInt((config.THROTTLE_AUTH_LIMIT as string) || '10', 10);

  return {
    nodeEnv,
    port,
    apiPrefix,
    appName,
    appUrl,
    databaseUrl,
    jwtAccessSecret,
    jwtRefreshSecret,
    sessionCookieSecret,
    jwtAccessExpiration,
    jwtRefreshExpiration,
    sessionTtlHours,
    maxFailedAttempts,
    lockoutMinutes,
    cookieName,
    cookieSecure,
    cookieSameSite,
    cookieDomain,
    csrfSecret,
    corsOrigin,
    throttleTtl,
    throttleLimit,
    throttleAuthLimit,
  };
}

function espejarClavesMayusculas(app: AppConfig): Record<string, string | boolean> {
  return {
    NODE_ENV: app.nodeEnv,
    PORT: String(app.port),
    DATABASE_URL: app.databaseUrl,
    API_PREFIX: app.apiPrefix,
    APP_NAME: app.appName,
    APP_URL: app.appUrl,
    JWT_ACCESS_SECRET: app.jwtAccessSecret,
    JWT_REFRESH_SECRET: app.jwtRefreshSecret,
    SESSION_COOKIE_SECRET: app.sessionCookieSecret,
    CSRF_SECRET: app.csrfSecret,
    JWT_ACCESS_EXPIRATION: app.jwtAccessExpiration,
    JWT_REFRESH_EXPIRATION: app.jwtRefreshExpiration,
    SESSION_TTL_HOURS: String(app.sessionTtlHours),
    MAX_FAILED_LOGIN_ATTEMPTS: String(app.maxFailedAttempts),
    LOCKOUT_DURATION_MINUTES: String(app.lockoutMinutes),
    COOKIE_NAME: app.cookieName,
    COOKIE_SECURE: app.cookieSecure ? 'true' : 'false',
    COOKIE_SAME_SITE: app.cookieSameSite,
    COOKIE_DOMAIN: app.cookieDomain,
    CORS_ORIGIN: app.corsOrigin,
    THROTTLE_TTL: String(app.throttleTtl),
    THROTTLE_LIMIT: String(app.throttleLimit),
    THROTTLE_AUTH_LIMIT: String(app.throttleAuthLimit),
  };
}

/** Entrada original + AppConfig camelCase + espejo MAYÚSCULAS para ConfigService.get('DATABASE_URL'). */
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const app = construirAppConfig(config);
  return {
    ...config,
    ...app,
    ...espejarClavesMayusculas(app),
  };
}