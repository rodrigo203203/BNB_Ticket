#!/usr/bin/env node
/**
 * Completa JWT_* y secretos en .env sin imprimir valores.
 * Multiplataforma (Windows Git Bash, PowerShell node, Linux).
 */
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const CLAVES = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_COOKIE_SECRET',
  'CSRF_SECRET',
];

function resolverRutasEnv() {
  const ejemplo = path.join(repoRoot, '.env.example');
  const env = path.join(repoRoot, '.env');
  if (!fs.existsSync(env)) {
    if (!fs.existsSync(ejemplo)) {
      throw new Error('No existe .env ni .env.example en la raíz del repositorio.');
    }
    fs.copyFileSync(ejemplo, env);
    console.log('Creado .env desde .env.example');
  }
  return env;
}

function detectarFinDeLinea(contenido) {
  return contenido.includes('\r\n') ? '\r\n' : '\n';
}

function parsearLineasEnv(contenido) {
  return contenido.split(/\r?\n/);
}

function valorVacio(valor) {
  if (valor === undefined || valor === null) return true;
  const t = String(valor).trim();
  return t.length === 0;
}

function generarSecreto() {
  return randomBytes(48).toString('base64url');
}

export function aplicarSecretosEnContenido(contenido, opciones = { forzar: false }) {
  const eol = detectarFinDeLinea(contenido);
  const lineas = parsearLineasEnv(contenido);
  const indice = new Map();
  lineas.forEach((linea, i) => {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) indice.set(m[1], i);
  });

  let cambios = 0;
  for (const clave of CLAVES) {
    const idx = indice.get(clave);
    let valorActual = '';
    if (idx !== undefined) {
      const m = lineas[idx].match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/);
      valorActual = m ? m[1] : '';
    }
    const debeEscribir = opciones.forzar || idx === undefined || valorVacio(valorActual);
    if (!debeEscribir) continue;
    const nueva = `${clave}=${generarSecreto()}`;
    if (idx !== undefined) {
      lineas[idx] = nueva;
    } else {
      lineas.push(nueva);
    }
    cambios += 1;
  }

  return { contenido: lineas.join(eol), cambios };
}

function main() {
  const forzar = process.argv.includes('--forzar');
  const envPath = resolverRutasEnv();
  const original = fs.readFileSync(envPath, 'utf8');
  const { contenido, cambios } = aplicarSecretosEnContenido(original, { forzar });
  if (cambios > 0) {
    fs.writeFileSync(envPath, contenido, 'utf8');
    console.log(`Actualizado ${envPath}: ${cambios} secreto(s) sin mostrar valores.`);
  } else {
    console.log('No se modificó .env: los secretos ya estaban definidos (use --forzar para regenerar).');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}