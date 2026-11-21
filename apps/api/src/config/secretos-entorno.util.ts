import { ConfigService } from '@nestjs/config';

/** Valores por defecto solo permitidos en desarrollo y pruebas (nunca en producción). */
export const VALORES_DEV_POR_DEFECTO = {
  JWT_ACCESS_SECRET: 'bnb_default_jwt_access_secret_for_dev_only_32_chars!',
  JWT_REFRESH_SECRET: 'bnb_default_jwt_refresh_secret_for_dev_only_32_chars!',
  SESSION_COOKIE_SECRET: 'bnb_default_cookie_secret_for_dev_only_32_chars!',
  CSRF_SECRET: 'bnb_default_csrf_secret_key_minimum_32_chars!',
} as const;

export type ClaveSecretoEntorno = keyof typeof VALORES_DEV_POR_DEFECTO;

export const CLAVES_SECRETOS_ENTORNO: ClaveSecretoEntorno[] = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_COOKIE_SECRET',
  'CSRF_SECRET',
];

const ETIQUETAS: Record<ClaveSecretoEntorno, string> = {
  JWT_ACCESS_SECRET: 'JWT_ACCESS_SECRET (firma de tokens de acceso)',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET (firma de tokens de refresco)',
  SESSION_COOKIE_SECRET: 'SESSION_COOKIE_SECRET (cookies firmadas de sesión)',
  CSRF_SECRET: 'CSRF_SECRET (protección CSRF)',
};

export const MENSAJE_AYUDA_GENERAR =
  'Genere valores con: npm run secretos:generar (o scripts/generar-secretos.sh en Git Bash).';

export function esEntornoProduccionEstricto(nodeEnv: string): boolean {
  return nodeEnv === 'production';
}

export type SecretosResueltos = Record<ClaveSecretoEntorno, string>;

function valorCrudo(config: Record<string, unknown>, clave: ClaveSecretoEntorno): string | undefined {
  const v = config[clave];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/**
 * Resuelve los cuatro secretos de seguridad y valida según NODE_ENV.
 * En dev/test emite avisos en español (sin imprimir valores). En producción lanza si falta o es default.
 */
function avisoPorDefecto(mensaje: string): void {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    return;
  }
  process.stderr.write(`${mensaje}\n`);
}

export function validarYResolverSecretos(
  config: Record<string, unknown>,
  emitirAviso: (mensaje: string) => void = avisoPorDefecto,
): SecretosResueltos {
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  const produccion = esEntornoProduccionEstricto(nodeEnv);
  const faltantes: string[] = [];
  const inseguros: string[] = [];
  const resuelto = {} as SecretosResueltos;

  for (const clave of CLAVES_SECRETOS_ENTORNO) {
    const crudo = valorCrudo(config, clave);
    const defecto = VALORES_DEV_POR_DEFECTO[clave];

    if (!crudo) {
      if (produccion) {
        faltantes.push(ETIQUETAS[clave]);
      } else {
        resuelto[clave] = defecto;
        emitirAviso(
          `[BNB] ${ETIQUETAS[clave]} no está definido o está vacío. Se usa un valor por defecto INSEGURO solo para desarrollo o pruebas. ${MENSAJE_AYUDA_GENERAR}`,
        );
      }
      continue;
    }

    if (produccion && crudo === defecto) {
      inseguros.push(ETIQUETAS[clave]);
      continue;
    }

    resuelto[clave] = crudo;
  }

  if (produccion) {
    if (faltantes.length > 0 || inseguros.length > 0) {
      const lineas: string[] = [
        'No se puede iniciar la API en producción: faltan secretos o siguen siendo los valores por defecto de desarrollo.',
      ];
      if (faltantes.length > 0) {
        lineas.push('', 'Variables faltantes o vacías:');
        faltantes.forEach((e) => lineas.push(`  - ${e}`));
      }
      if (inseguros.length > 0) {
        lineas.push('', 'Variables con valor por defecto de desarrollo (no permitido en producción):');
        inseguros.forEach((e) => lineas.push(`  - ${e}`));
      }
      lineas.push('', MENSAJE_AYUDA_GENERAR);
      throw new Error(lineas.join('\n'));
    }
    for (const clave of CLAVES_SECRETOS_ENTORNO) {
      resuelto[clave] = valorCrudo(config, clave)!;
    }
  }

  for (const clave of CLAVES_SECRETOS_ENTORNO) {
    process.env[clave] = resuelto[clave];
  }

  return resuelto;
}

/** Única fuente para leer secretos ya validados desde Nest ConfigService (camelCase de AppConfig). */
export function obtenerJwtAccessSecret(config: ConfigService): string {
  return config.getOrThrow<string>('jwtAccessSecret');
}

export function obtenerJwtRefreshSecret(config: ConfigService): string {
  return config.getOrThrow<string>('jwtRefreshSecret');
}

export function obtenerSessionCookieSecret(config: ConfigService): string {
  return config.getOrThrow<string>('sessionCookieSecret');
}

export function obtenerCsrfSecret(config: ConfigService): string {
  return config.getOrThrow<string>('csrfSecret');
}