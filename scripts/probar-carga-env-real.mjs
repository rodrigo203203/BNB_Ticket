#!/usr/bin/env node
/**
 * Prueba manual: el .env del repo gana sobre PORT/DATABASE_URL del entorno (sin imprimir secretos en claro).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const apiRoot = path.join(repoRoot, 'apps', 'api');
const webRoot = path.join(repoRoot, 'apps', 'web');
const tsNode = (() => {
  const candidates = [
    path.join(apiRoot, 'node_modules', 'ts-node', 'dist', 'bin.js'),
    path.join(repoRoot, 'node_modules', 'ts-node', 'dist', 'bin.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No se encontró ts-node');
})();
const runPrisma = path.join(apiRoot, 'scripts', 'run-prisma-with-env.ts');

const puertoSistema = '1998';
const puertoArchivo = '3005';
const urlSistema =
  'postgresql://sistema:secret@127.0.0.1:5432/sistema?schema=public';
const urlArchivo =
  'postgresql://archivo:secret@127.0.0.1:5432/archivo?schema=public';
const rootEnv = path.join(repoRoot, '.env');
const apiEnv = path.join(apiRoot, '.env');

let backupRoot = null;
let backupApi = null;
if (fs.existsSync(rootEnv)) {
  backupRoot = fs.readFileSync(rootEnv, 'utf8');
}
if (fs.existsSync(apiEnv)) {
  backupApi = fs.readFileSync(apiEnv, 'utf8');
}

fs.writeFileSync(
  rootEnv,
  `PORT=${puertoArchivo}\nDATABASE_URL=${urlArchivo}\nNODE_ENV=development\nJWT_ACCESS_SECRET=test_test_test_test_test_test_test_32\nJWT_REFRESH_SECRET=test_test_test_test_test_test_test_32\nSESSION_COOKIE_SECRET=test_test_test_test_test_test_test_32\nCSRF_SECRET=test_test_test_test_test_test_test_32\n`,
);
if (fs.existsSync(apiEnv)) fs.unlinkSync(apiEnv);

function restoreEnv() {
  if (backupRoot !== null) fs.writeFileSync(rootEnv, backupRoot);
  else if (fs.existsSync(rootEnv)) fs.unlinkSync(rootEnv);
  if (backupApi !== null) fs.writeFileSync(apiEnv, backupApi);
  else if (fs.existsSync(apiEnv)) fs.unlinkSync(apiEnv);
}

try {
  const cargar = spawnSync(
    process.execPath,
    [
      tsNode,
      '-e',
      `process.env.BNB_ENV_AUTOLOAD='0';
const { cargarEntorno } = require('./src/config/cargar-entorno');
const path = require('path');
cargarEntorno(path.join(__dirname, 'src', 'config'));
console.log(JSON.stringify({ PORT: process.env.PORT, hasDb: Boolean(process.env.DATABASE_URL) }));`,
    ],
    {
      cwd: apiRoot,
      env: {
        ...process.env,
        BNB_ENV_AUTOLOAD: '0',
        PORT: puertoSistema,
        DATABASE_URL: urlSistema,
      },
      encoding: 'utf8',
    },
  );
  if (cargar.status !== 0) {
    console.error(cargar.stderr || cargar.stdout);
    process.exit(1);
  }
  const line = cargar.stdout.trim().split('\n').pop();
  const parsed = JSON.parse(line);
  if (parsed.PORT !== puertoArchivo || !parsed.hasDb) {
    console.error('Falló precedencia .env sobre entorno:', parsed);
    process.exit(1);
  }
  console.log('OK cargarEntorno: .env gana sobre PORT/DATABASE_URL del sistema');

  const val = spawnSync(process.execPath, [tsNode, runPrisma, 'validate'], {
    cwd: apiRoot,
    env: {
      ...process.env,
      PORT: puertoSistema,
      DATABASE_URL: urlSistema,
    },
    encoding: 'utf8',
  });
  if (val.status !== 0) {
    console.error('prisma validate falló:', val.stderr || val.stdout);
    process.exit(1);
  }
  console.log('OK prisma:validate lee DATABASE_URL del .env');

  const viteProbe = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { loadEnv } from 'vite';
import path from 'path';
import { resolverTargetProxyApi } from './src/config/resolver-proxy-api.ts';
const repoRoot = path.resolve('${repoRoot.replace(/\\/g, '\\\\')}');
const env = loadEnv('development', repoRoot, '');
const t = resolverTargetProxyApi(env);
if (t !== 'http://127.0.0.1:${puertoArchivo}') { console.error('proxy', t); process.exit(1); }
console.log('OK vite proxy ->', t);`,
    ],
    { cwd: webRoot, encoding: 'utf8' },
  );
  if (viteProbe.status !== 0) {
    console.error(viteProbe.stderr || viteProbe.stdout);
    process.exit(1);
  }
  console.log(viteProbe.stdout.trim());

  fs.writeFileSync(apiEnv, `PORT=3006\n`);
  const cargarApi = spawnSync(
    process.execPath,
    [
      tsNode,
      '-e',
      `process.env.BNB_ENV_AUTOLOAD='0';
const { cargarEntorno } = require('./src/config/cargar-entorno');
const path = require('path');
cargarEntorno(path.join(__dirname, 'src', 'config'));
console.log(process.env.PORT);`,
    ],
    {
      cwd: apiRoot,
      env: { ...process.env, BNB_ENV_AUTOLOAD: '0', PORT: puertoSistema },
      encoding: 'utf8',
    },
  );
  const puertoApi = cargarApi.stdout.trim().split('\n').pop();
  if (puertoApi !== '3006') {
    console.error('Falló apps/api/.env sobre raíz:', puertoApi);
    process.exit(1);
  }
  console.log('OK apps/api/.env gana sobre raíz (PORT=3006)');
} finally {
  restoreEnv();
}