/**
 * Snapshot del entorno antes de cargar specs (jest setupFiles).
 * Carga `.env` con la misma precedencia que la API, luego congela claves para integración.
 */
import * as path from 'path';
import { cargarEntorno } from '../../src/config/cargar-entorno';

export type BnbTestEnvInicial = {
  DATABASE_URL?: string;
  RUN_DB_TESTS?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  DEMO_SEED_PASSWORD?: string;
};

declare global {
  var __BNB_TEST_ENV_INICIAL__: BnbTestEnvInicial | undefined;
}

const raizConfigApi = path.join(__dirname, '../../src/config');
cargarEntorno(raizConfigApi);

globalThis.__BNB_TEST_ENV_INICIAL__ = {
  DATABASE_URL: process.env.DATABASE_URL,
  RUN_DB_TESTS: process.env.RUN_DB_TESTS,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  DEMO_SEED_PASSWORD: process.env.DEMO_SEED_PASSWORD,
};