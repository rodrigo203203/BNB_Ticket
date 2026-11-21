# Instalación offline (Windows x64)

Este flujo permite desplegar BNB_Ticket en un **servidor Windows 11 x64 sin acceso a internet**, armando el paquete en otra máquina Windows x64 que sí tenga red.

## Requisitos en ambas máquinas

| Requisito | Detalle |
|-----------|---------|
| Sistema operativo | Windows 64 bits (mismo en build y en servidor) |
| Node.js | Versión **LTS >= 20**, misma **major** en ambas máquinas |
| Gestor | **npm** (incluido con Node); workspaces definidos en `package.json` raíz |
| Arquitectura | x64 (`win32-x64`) |

**Advertencia:** no copiar `node_modules` desde macOS o Linux al servidor Windows. Los binarios nativos (`@node-rs/argon2`, engines de Prisma, Rollup/esbuild) son específicos del SO.

## Máquina con internet (build)

1. Clonar el repositorio (rama `fix/env-first` o `main` según su despliegue).
2. Desde PowerShell en la raíz del repo:
   ```powershell
   .\scripts\offline\build-package.ps1
   ```
3. El script ejecuta internamente:
   - `npm ci` (lockfile reproducible; incluye devDependencies usadas en build y Prisma CLI).
   - `npm run prisma:validate` y `npm run prisma:generate` (`binaryTargets`: `native`, `windows`).
   - `npm run build` (`@bnb/shared`, `@bnb/api`, `@bnb/web`).
4. Copiar al servidor (USB, red interna, etc.):
   - `dist-offline/bnb-ticket-offline-<versión>-win32-x64.zip`
   - `dist-offline/manifest-<versión>.json` (contiene SHA256 y versión de Node).

### ¿Por qué `concurrently` en desarrollo?

`npm run dev --workspaces` ejecuta scripts en serie. Para API + web en paralelo se usa **`concurrently`** en la raíz (dependencia de desarrollo ligera, sin impacto en el zip de producción si solo se copia lo compilado + `node_modules` de producción implícito en el empaquetado completo).

### Contenido de `node_modules` en el ZIP

El ZIP incluye `node_modules` completo tras `npm ci` en la **máquina de build Windows x64**, porque:

- `@node-rs/argon2` y `@prisma/client` requieren prebuilds **win32-x64** ya resueltos.
- En el servidor **no** se ejecuta `npm install` ni `prisma generate`.

En el servidor **sí** se usa el **CLI de Prisma ya empaquetado** dentro del ZIP, solo mediante los scripts npm incluidos (por ejemplo `npm run prisma:migrate:deploy` desde la raíz del paquete descomprimido). No hace falta instalar Prisma por separado ni tener red.

## Git Bash (Windows 11, sin PowerShell obligatorio)

Los mismos pasos pueden ejecutarse con **Git Bash**. Scripts equivalentes:

| PowerShell | Git Bash |
|------------|----------|
| `.\scripts\offline\build-package.ps1` | `bash scripts/offline/build-package.sh` |
| `.\scripts\offline\install-server.ps1` | `bash scripts/offline/install-server.sh <zip> [dir]` |
| `.\scripts\postgres\initdb.ps1` | `bash scripts/postgres/init.sh` |
| `.\scripts\postgres\start.ps1` | `bash scripts/postgres/start.sh` |
| `.\scripts\postgres\stop.ps1` | `bash scripts/postgres/stop.sh` |
| `.\scripts\postgres\create-db.ps1` | `bash scripts/postgres/create-db.sh` |

### Requisitos

- Node.js portable o instalado x64 (major >= 20).
- PostgreSQL **portable** (zip con `initdb`/`pg_ctl`) **o** servicio Windows (`PG_MODE=service` en `.env` o `postgres.local.config.json`).
- Un solo `.env` en la **raíz** del monorepo; no hace falta copiarlo a `apps/api/.env` (los comandos `npm run prisma:*`, `seed:admin` y la API leen la raíz vía `cargar-entorno.ts`).

### Secuencia en el servidor (Git Bash)

1. Descomprimir el ZIP (`install-server.sh`) en una ruta **sin espacios problemáticos** o usar comillas: `"/c/Program Files/BNB"`.
2. `cp .env.example .env` y editar:
   - `DATABASE_URL` (tras `create-db.sh`).
   - Secretos: `npm run secretos:generar` (una vez) o pegar valores generados.
   - `ADMIN_PASSWORD` (mínimo 8 caracteres, misma regla que el login).
3. PostgreSQL portable:
   ```bash
   export PG_BIN="/c/ruta/postgresql-16/bin"
   export PGDATA="/c/datos/bnb-pgdata"
   # POSTGRES_SUPERUSER_PASSWORD y BNB_DB_PASSWORD en .env
   bash scripts/postgres/init.sh
   bash scripts/postgres/start.sh
   bash scripts/postgres/create-db.sh
   ```
4. Migraciones y admin (desde la raíz del paquete, **sin** `export DATABASE_URL` manual):
   ```bash
   npm run prisma:migrate:deploy
   npm run seed:admin
   ```
5. API: `node apps/api/dist/src/main.js` — la SPA en `apps/web/dist` (IIS o `npx serve`).
6. Proxy Vite (solo desarrollo): el target sigue `VITE_API_PROXY_TARGET` o `PORT` del `.env` raíz (p. ej. `3005`).

### Desbloquear admin (lockout)

Tras varios intentos fallidos de login, la cuenta queda bloqueada. **No** se imprime la contraseña:

```bash
# Solo desbloquear (intentos en 0)
npm run admin:reset

# Desbloquear y nueva contraseña (desde .env ADMIN_PASSWORD válida)
ADMIN_PASSWORD='SuClaveSegura8' npm run admin:reset
```

### Prisma sin internet ni proxy corporativo

- `schema.prisma` usa `binaryTargets = ["native", "windows"]`.
- Los engines van dentro de `node_modules` (`.prisma/client` y `@prisma/engines`); el paquete se arma en **Windows x64** con `build-package.sh` / `.ps1`.
- Los wrappers (`run-prisma-with-env.ts`, scripts de build) definen `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` y **quitan** `HTTP_PROXY` / `HTTPS_PROXY` solo para esos procesos.
- Opcional en servidor: `PRISMA_QUERY_ENGINE_LIBRARY` / `PRISMA_SCHEMA_ENGINE_BINARY` apuntando a los binarios ya incluidos en el paquete.

### Binarios nativos (importante)

| Paquete | Notas |
|---------|--------|
| `@node-rs/argon2` | Prebuild **win32-x64**; el ZIP debe generarse en Windows. **No** copiar `node_modules` desde Linux/macOS. |
| `@prisma/client` | Engine `query_engine-windows.dll.node` incluido tras `prisma generate` en Windows. |
| bcrypt | No se usa; contraseñas con Argon2id en JS nativo (`@node-rs/argon2`). |

El ZIP **no** incluye ningún `.env` real, solo `.env.example`.

### Solución de problemas

| Síntoma | Causa habitual | Acción |
|---------|----------------|--------|
| Login 500 `secretOrPrivateKey must have a value` | Config Nest sin claves MAYÚSCULAS | Actualizar API (`validateEnvironment` fusiona env); solo `.env` raíz + `npm run secretos:generar` |
| Prisma intenta descargar engines | Proxy corporativo | Quitar proxy en el script; usar paquete pregenerado en Windows |
| `seed:admin` sale con 1 | `ADMIN_PASSWORD` &lt; 8 caracteres | Corregir `.env` |
| Cuenta bloqueada | Lockout por intentos | `npm run admin:reset` |
| Puerto API ocupado | Otro proceso en `PORT` | Cambiar `PORT` en `.env` raíz y proxy Vite |

## Servidor sin internet

1. Instalar Node.js x64 (misma major que en build).
2. PowerShell como administrador (rutas según su política):
   ```powershell
   .\scripts\offline\install-server.ps1 `
     -ZipPath "D:\Paquetes\bnb-ticket-offline-20261120-120000-win32-x64.zip" `
     -ManifestPath "D:\Paquetes\manifest-20261120-120000.json" `
     -InstallDir "D:\Aplicaciones\BNB_Tickets"
   ```
3. Editar `.env` en la **raíz** (y opcionalmente `apps/api/.env` para overrides). Precedencia: SO → raíz → `apps/api/.env`. No commitear secretos. En producción defina `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_COOKIE_SECRET` y `CSRF_SECRET` (o ejecute `npm run secretos:generar` una vez en el servidor).
4. **PostgreSQL**: ver [postgres.md](./postgres.md). Modo **portable** (típico offline): `initdb.ps1` → `start.ps1` → `create-db.ps1`. Modo **service**: omitir `initdb.ps1`; use `start.ps1` (arranca el servicio). Antes del API, PostgreSQL debe estar en ejecución.
5. Arrancar API:
   ```powershell
   cd D:\Aplicaciones\BNB_Tickets\apps\api
   node dist\src\main.js
   ```
6. Publicar `apps\web\dist` en IIS (`docs/deployment-windows.md`).

## Verificación tras instalar

- `GET http://localhost:<PORT>/api/v1/health` responde OK (`PORT` del `.env` raíz; en desarrollo suele ser **3005** si el proxy Vite apunta ahí, o **3000** si no se ha cambiado).
- La SPA carga sin errores en consola de red (no debe haber peticiones a Google Fonts ni otros CDNs).
- Login con credenciales configuradas en la base de datos (no usar seed destructivo en producción).

## Tipografía

La fuente **Inter** se importa desde `@fontsource/inter` en el bundle de Vite; no se requiere conexión externa.

## Límites de prueba fuera de Windows

En entornos Linux/macOS de CI o agentes en la nube se puede validar `npm ci`, `build`, `test` y `prisma generate` (`native`), pero el **ZIP oficial** y la validación de binarios `win32-x64` en el lockfile deben generarse en Windows x64.