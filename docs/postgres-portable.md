# PostgreSQL portable (Windows x64)

Uso de binarios oficiales en **ZIP** (sin instalador de servicio Windows). Los scripts viven en `scripts/postgres/`.

## Prerrequisitos

1. Descomprimir el zip de PostgreSQL (misma major en build y servidor, p. ej. 16 x64).
2. Copiar `scripts/postgres/postgres.config.example.json` a `scripts/postgres/postgres.local.config.json` (ignorado por git) y ajustar rutas.
3. Definir contraseñas solo por **entorno** (nunca en el repo):
   - `POSTGRES_SUPERUSER_PASSWORD` — superusuario tras `initdb`.
   - `BNB_DB_PASSWORD` — usuario de aplicación (`bnb_app` por defecto).

Variables opcionales: `PG_BIN`, `PGDATA`, `PGPORT`, `BNB_DB_NAME`, `BNB_DB_USER`, `BNB_PG_BACKUP_DIR`.

## Orden de arranque (servidor nuevo)

```powershell
cd D:\Aplicaciones\BNB_Tickets\scripts\postgres

$env:POSTGRES_SUPERUSER_PASSWORD = "<definir>"
$env:BNB_DB_PASSWORD = "<definir>"

.\initdb.ps1
.\start.ps1
.\create-db.ps1
```

Luego en la raíz del proyecto:

```powershell
npm run prisma:migrate:deploy
npm run seed:admin
```

## Operación diaria

| Script | Función |
|--------|---------|
| `start.ps1` | `pg_ctl start` |
| `stop.ps1` | `pg_ctl stop` |
| `status.ps1` | Estado del clúster |
| `backup.ps1` | `pg_dump` custom a `backupDir` |
| `restore.ps1 -DumpPath ...` | `pg_restore` |

Atajos `.cmd` disponibles para cada `.ps1`.

## Integración con instalación offline

Tras `scripts/offline/install-server.ps1`, ejecute `start.ps1` **antes** del API Node. Ver [instalacion-offline.md](./instalacion-offline.md).

## Autenticación

`initdb` configura **scram-sha-256** para conexiones locales y host.