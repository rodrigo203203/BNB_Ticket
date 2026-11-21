/**
 * Ejecuta el CLI de Prisma tras cargar `.env` (raíz + apps/api).
 * Multiplataforma: sin `VAR=x cmd` ni sintaxis exclusiva de Unix/Windows.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { cargarEntorno } from '../src/config/cargar-entorno';

const apiRoot = path.resolve(__dirname, '..');
cargarEntorno(path.join(apiRoot, 'src', 'config'));

const prismaArgs = process.argv.slice(2);
if (!prismaArgs.length) {
  console.error('Uso: ts-node scripts/run-prisma-with-env.ts <comando prisma> [args…]');
  process.exit(1);
}

const prismaEntry = require.resolve('prisma/build/index.js');
const resultado = spawnSync(process.execPath, [prismaEntry, ...prismaArgs], {
  cwd: apiRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(resultado.status === null ? 1 : resultado.status);