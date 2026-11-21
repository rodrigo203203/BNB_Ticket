import * as fs from 'fs';
import * as path from 'path';

/**
 * Localiza la carpeta `apps/api` buscando `prisma/schema.prisma` hacia arriba desde un directorio.
 * No depende de `process.cwd()` (válido en Git Bash, cmd y PowerShell).
 */
export function encontrarRaizApi(desdeDirectorio: string): string {
  let dir = path.resolve(desdeDirectorio);
  const raizFs = path.parse(dir).root;

  while (true) {
    const schema = path.join(dir, 'prisma', 'schema.prisma');
    if (fs.existsSync(schema)) {
      return dir;
    }
    if (dir === raizFs) {
      throw new Error(
        `No se encontró apps/api (prisma/schema.prisma) ascendiendo desde ${desdeDirectorio}`,
      );
    }
    dir = path.dirname(dir);
  }
}

/** Raíz del monorepo: padre de `apps/` cuando la API está en `apps/api`. */
export function encontrarRaizMonorepo(raizApi: string): string {
  const appsDir = path.dirname(raizApi);
  if (path.basename(appsDir) !== 'apps') {
    throw new Error(`Se esperaba apps/api bajo apps/; recibido: ${raizApi}`);
  }
  return path.dirname(appsDir);
}

/**
 * Orden de carga: primero `.env` de la raíz, luego `apps/api/.env` (este gana en claves duplicadas).
 */
export function listarArchivosEnvEnOrden(raizMonorepo: string, raizApi: string): string[] {
  return [path.join(raizMonorepo, '.env'), path.join(raizApi, '.env')];
}