# Pruebas de integración (API + Postgres)

## Suites que requieren base de datos

Los archivos `*.integration.spec.ts` y el bloque HTTP de `auth-login.env.integration.spec.ts` solo corren si, **al arrancar Jest**, existe `DATABASE_URL` (variable de entorno o archivo `.env` en la raíz / `apps/api/.env`, cargado por `cargar-entorno.ts`).

Sin Postgres ni `DATABASE_URL`:

```bash
env -u DATABASE_URL npm test --workspace=@bnb/api
```

→ las suites de integración quedan **omitidas** (comportamiento esperado en CI sin BD).

## Scripts Bash y `.env`

Los scripts `build-package.sh` y `scripts/postgres/*.sh` leen `.env` con `scripts/lib/cargar-env.sh` (parser línea a línea, sin `source`/`eval`). Misma precedencia que TypeScript: `.env` en la raíz y luego `apps/api/.env`. Evita fallos en Git Bash cuando valores como `ADMIN_FULL_NAME="Administrador del Sistema"` no van entre comillas.

Prueba del cargador y del verificador offline:

```bash
npm run test:scripts
```

## Ejecutar integración en local

1. Defina `DATABASE_URL` en `.env` raíz (y secretos JWT si aplica).
2. Defina contraseñas de prueba:
   - Tras `npm run seed:demo`: use `DEMO_SEED_PASSWORD` en `.env` (misma para todos los usuarios demo, incluido `admin@bnb.com.bo`).
   - Tras solo `npm run seed:admin`: use `ADMIN_PASSWORD` en `.env` y opcionalmente `ADMIN_EMAIL`.
3. Opcional: fuerce ejecución con `RUN_DB_TESTS=1` (sigue exigiendo `DATABASE_URL`).

Atajo que prepara schema y datos demo y lanza las suites de integración de la API:

```bash
npm run test:integration
```

Equivale a comprobar `DATABASE_URL` y `DEMO_SEED_PASSWORD`/`ADMIN_PASSWORD` (`scripts/test-integration-preflight.sh`), `prisma:migrate:deploy`, `seed:demo` y Jest filtrando integración. Si falta contraseña, el preflight termina con un mensaje claro (no un 401 opaco). **No** imprime contraseñas por defecto; para verlas en consola al sembrar: `SEED_MOSTRAR_CONTRASENAS=1 npm run seed:demo` o `npm run seed:demo -- --mostrar-contrasenas`.

## Login en auth-login.env.integration

El test de login usa `contrasenaLoginIntegracion()` (`DEMO_SEED_PASSWORD` y luego `ADMIN_PASSWORD` del snapshot del `.env`). Si falta contraseña en `.env`, el caso de login falla con un mensaje que indica ejecutar `npm run test:integration` o definir esas variables.