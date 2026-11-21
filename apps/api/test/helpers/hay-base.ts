import type { BnbTestEnvInicial } from './capturar-entorno-inicial';

function entornoInicial(): BnbTestEnvInicial {
  return globalThis.__BNB_TEST_ENV_INICIAL__ ?? {};
}

/** URL de BD capturada al arrancar Jest (tras cargar `.env`, sin fugas en runtime). */
export function urlBaseDeDatosInicial(): string | undefined {
  const url = entornoInicial().DATABASE_URL;
  if (typeof url !== 'string') return undefined;
  const t = url.trim();
  return t.length ? t : undefined;
}

/** Correo admin para integración: `ADMIN_EMAIL` del `.env` o default demo. */
export function emailLoginIntegracion(): string {
  const e = entornoInicial().ADMIN_EMAIL?.trim();
  return e || 'admin@bnb.com.bo';
}

/**
 * Contraseña para login en integración:
 * prioriza `DEMO_SEED_PASSWORD` (tras `seed:demo`), luego `ADMIN_PASSWORD` (tras `seed:admin`).
 */
export function contrasenaLoginIntegracion(): string | undefined {
  const ini = entornoInicial();
  const demo = ini.DEMO_SEED_PASSWORD?.trim();
  if (demo) return demo;
  const admin = ini.ADMIN_PASSWORD?.trim();
  return admin || undefined;
}

/**
 * ¿Ejecutar tests que abren Prisma / HTTP contra la BD?
 * - `RUN_DB_TESTS=0` → nunca
 * - `RUN_DB_TESTS=1` → sí (exige DATABASE_URL del snapshot o en el lanzamiento)
 * - Por defecto: solo si `DATABASE_URL` quedó en el snapshot (p. ej. desde `.env` raíz).
 */
export function hayBaseDeDatosParaTests(): boolean {
  const ini = entornoInicial();
  const runFlag = ini.RUN_DB_TESTS ?? process.env.RUN_DB_TESTS;
  if (runFlag === '0') return false;
  const url = urlBaseDeDatosInicial();
  if (runFlag === '1') {
    return Boolean(url ?? process.env.DATABASE_URL?.trim());
  }
  return Boolean(url);
}