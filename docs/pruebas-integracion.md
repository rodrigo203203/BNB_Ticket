# Pruebas de integración (API + Postgres)

## Suites que requieren base de datos

Los archivos `*.integration.spec.ts` y el bloque HTTP de `auth-login.env.integration.spec.ts` solo corren si, **al arrancar Jest**, existe `DATABASE_URL` (variable de entorno o archivo `.env` en la raíz / `apps/api/.env`, cargado por `cargar-entorno.ts`).

Sin Postgres ni `DATABASE_URL`:

```bash
env -u DATABASE_URL npm test --workspace=@bnb/api
```

→ las suites de integración quedan **omitidas** (comportamiento esperado en CI sin BD).

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

Equivale a `prisma:migrate:deploy` + `seed:demo` + Jest filtrando integración. **No** imprime contraseñas por defecto; para verlas en consola al sembrar: `SEED_MOSTRAR_CONTRASENAS=1 npm run seed:demo` o `npm run seed:demo -- --mostrar-contrasenas`.

## Login en auth-login.env.integration

El test de login usa `contrasenaLoginIntegracion()` (`DEMO_SEED_PASSWORD` y luego `ADMIN_PASSWORD` del snapshot del `.env`). Si falta contraseña en `.env`, el caso de login falla con un mensaje que indica ejecutar `npm run test:integration` o definir esas variables.