import type { BnbTestEnvInicial } from './capturar-entorno-inicial';

function entornoInicial(): BnbTestEnvInicial {
  return globalThis.__BNB_TEST_ENV_INICIAL__ ?? {};
}

/** URL de BD capturada al arrancar Jest (antes de imports que muten process.env). */
export function urlBaseDeDatosInicial(): string | undefined {
  const url = entornoInicial().DATABASE_URL;
  if (typeof url !== 'string') return undefined;
  const t = url.trim();
  return t.length ? t : undefined;
}

/**
 * ¿Ejecutar tests que abren Prisma / HTTP contra la BD?
 * - `RUN_DB_TESTS=0` → nunca
 * - `RUN_DB_TESTS=1` → sí (exige DATABASE_URL inicial o en el lanzamiento)
 * - Por defecto: solo si había DATABASE_URL real al iniciar Jest (p. ej. `.env` del desarrollador exportado).
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