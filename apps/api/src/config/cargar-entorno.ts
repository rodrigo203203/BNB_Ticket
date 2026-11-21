import * as fs from 'fs';
import dotenv from 'dotenv';
import {
  encontrarRaizApi,
  encontrarRaizMonorepo,
  listarArchivosEnvEnOrden,
} from './rutas-entorno.util';

export type ResultadoCargaEntorno = {
  raizMonorepo: string;
  raizApi: string;
  archivosCargados: string[];
};

/** Evita doble carga cuando varios entrypoints importan este módulo. */
let yaCargado = false;

/**
 * Carga variables desde `.env` de la raíz del monorepo y `apps/api/.env`.
 * Precedencia: sistema < raíz < apps/api (cada archivo usa `override: true` como pidió Rodrigo).
 */
export function cargarEntorno(desdeDirectorio = __dirname): ResultadoCargaEntorno {
  const raizApi = encontrarRaizApi(desdeDirectorio);
  const raizMonorepo = encontrarRaizMonorepo(raizApi);
  const archivos = listarArchivosEnvEnOrden(raizMonorepo, raizApi);
  const archivosCargados: string[] = [];

  for (const archivo of archivos) {
    if (!fs.existsSync(archivo)) continue;
    const resultado = dotenv.config({ path: archivo, override: true });
    if (resultado.error) {
      throw resultado.error;
    }
    archivosCargados.push(archivo);
  }

  return { raizMonorepo, raizApi, archivosCargados };
}

export function cargarEntornoUnaVez(desdeDirectorio = __dirname): ResultadoCargaEntorno | null {
  if (yaCargado) return null;
  yaCargado = true;
  return cargarEntorno(desdeDirectorio);
}

/** Reinicia el guard (solo tests). */
export function reiniciarEstadoCargaEntornoParaTests(): void {
  yaCargado = false;
}

function debeAutocargarAlImportar(): boolean {
  if (process.env.BNB_ENV_AUTOLOAD === '0') return false;
  if (process.env.JEST_WORKER_ID !== undefined) return false;
  return true;
}

if (debeAutocargarAlImportar()) {
  cargarEntornoUnaVez(__dirname);
}