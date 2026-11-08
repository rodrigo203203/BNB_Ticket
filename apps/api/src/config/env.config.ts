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

export function validateEnvironment(config: Record<string, unknown>): AppConfig {
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  const port = parseInt((config.PORT as string) || '3000', 10);
  const apiPrefix = (config.API_PREFIX as string) || 'api/v1';
  const appName = (config.APP_NAME as string) || 'BNB Gerencia de Datos - Gestión de Solicitudes';
  const appUrl = (config.APP_URL as string) || 'http://localhost:5173';
  const databaseUrl = (config.DATABASE_URL as string) || 'postgresql://postgres:postgres@localhost:5432/bnb_tickets_dev?schema=public';

  const jwtAccessSecret = (config.JWT_ACCESS_SECRET as string) || 'bnb_default_jwt_access_secret_for_dev_only_32_chars!';
  const jwtRefreshSecret = (config.JWT_REFRESH_SECRET as string) || 'bnb_default_jwt_refresh_secret_for_dev_only_32_chars!';
  const sessionCookieSecret = (config.SESSION_COOKIE_SECRET as string) || 'bnb_default_cookie_secret_for_dev_only_32_chars!';

  const jwtAccessExpiration = (config.JWT_ACCESS_EXPIRATION as string) || '15m';
  const jwtRefreshExpiration = (config.JWT_REFRESH_EXPIRATION as string) || '7d';
  const sessionTtlHours = parseInt((config.SESSION_TTL_HOURS as string) || '168', 10);

  const maxFailedAttempts = parseInt((config.MAX_FAILED_LOGIN_ATTEMPTS as string) || '5', 10);
  const lockoutMinutes = parseInt((config.LOCKOUT_DURATION_MINUTES as string) || '15', 10);

  const cookieName = (config.COOKIE_NAME as string) || 'bnb_session';
  const cookieSecure = config.COOKIE_SECURE === 'true' || config.NODE_ENV === 'production';
  const cookieSameSite = ((config.COOKIE_SAME_SITE as string) || 'lax') as 'lax' | 'strict' | 'none';
  const cookieDomain = (config.COOKIE_DOMAIN as string) || 'localhost';

  const csrfSecret = (config.CSRF_SECRET as string) || 'bnb_default_csrf_secret_key_minimum_32_chars!';
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
