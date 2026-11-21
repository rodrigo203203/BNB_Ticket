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

1. Clonar el repositorio y usar la rama `chore/npm-offline` o `main` cuando se fusione.
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

### devDependencies en el paquete de producción

El ZIP incluye `node_modules` completo tras `npm ci` en la máquina de build, porque:

- `@node-rs/argon2` y `@prisma/client` requieren binarios nativos ya resueltos para Windows.
- En el servidor **no** se ejecuta `npm install`.

Si en el futuro se reduce el tamaño del paquete, habrá que usar `npm ci --omit=dev` solo después de confirmar que el API no necesita ningún paquete de desarrollo en tiempo de ejecución (hoy `prisma` CLI no va al servidor si solo se usa `node dist/...`).

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

- `GET http://localhost:3000/api/v1/health` (o la ruta configurada) responde OK.
- La SPA carga sin errores en consola de red (no debe haber peticiones a Google Fonts ni otros CDNs).
- Login con credenciales configuradas en la base de datos (no usar seed destructivo en producción).

## Tipografía

La fuente **Inter** se importa desde `@fontsource/inter` en el bundle de Vite; no se requiere conexión externa.

## Límites de prueba fuera de Windows

En entornos Linux/macOS de CI o agentes en la nube se puede validar `npm ci`, `build`, `test` y `prisma generate` (`native`), pero el **ZIP oficial** y la validación de binarios `win32-x64` en el lockfile deben generarse en Windows x64.