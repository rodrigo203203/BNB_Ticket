/**
 * Snapshot del entorno antes de cargar specs (jest setupFiles).
 * Evita que dotenv/otros tests activen integración con una DATABASE_URL fugada.
 */
export type BnbTestEnvInicial = {
  DATABASE_URL?: string;
  RUN_DB_TESTS?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __BNB_TEST_ENV_INICIAL__: BnbTestEnvInicial | undefined;
}

globalThis.__BNB_TEST_ENV_INICIAL__ = {
  DATABASE_URL: process.env.DATABASE_URL,
  RUN_DB_TESTS: process.env.RUN_DB_TESTS,
};