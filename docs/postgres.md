# PostgreSQL en Windows (portable o servicio)

La plataforma BNB admite **dos formas** de ejecutar PostgreSQL en Windows x64. Elija una con `"mode"` en `scripts/postgres/postgres.local.config.json` o la variable `PG_MODE` (`portable` | `service`).

| Modo | Cuándo usarlo |
|------|----------------|
| **portable** | Servidor **sin** instalador de servicio: binarios en ZIP + `pg_ctl` (despliegue offline típico). |
| **service** | PostgreSQL ya instalado como **servicio Windows** (p. ej. desde el instalador oficial EDB). |

Contraseñas **nunca** en el repo: `POSTGRES_SUPERUSER_PASSWORD`, `BNB_DB_PASSWORD`, opcionalmente `PGPASSWORD`.

## Configuración (`postgres.local.config.json`)

Copie `scripts/postgres/postgres.config.example.json` a `postgres.local.config.json` (gitignored).

```json
{
  "mode": "portable",
  "serviceName": "postgresql-x64-16",
  "pgBin": "D:\\PostgreSQL\\pgsql\\bin",
  "pgData": "D:\\BNB\\postgres\\data",
  "pgPort": 5432,
  "superuser": "postgres",
  "dbName": "bnb_tickets",
  "dbUser": "bnb_app",
  "backupDir": "D:\\BNB\\postgres\\backups"
}
```

- **portable:** `pgBin` y `pgData` obligatorios (o `PG_BIN` / `PGDATA`).
- **service:** `serviceName` obligatorio; `pgBin` opcional (se intenta detectar en `Program Files\PostgreSQL\<major>\bin`). `pgData` no se usa para arranque.

`PG_MODE` en el entorno tiene prioridad sobre el JSON.

## Modo portable (zip)

1. Descomprimir el zip oficial (misma major en build y servidor, p. ej. 16 x64).
2. Configurar rutas en `postgres.local.config.json` (`mode`: `portable`).
3. Primera vez:

```powershell
cd D:\Aplicaciones\BNB_Tickets\scripts\postgres
$env:POSTGRES_SUPERUSER_PASSWORD = "<definir>"
$env:BNB_DB_PASSWORD = "<definir>"
.\initdb.ps1
.\start.ps1
.\create-db.ps1
```

4. Migraciones y seed desde la raíz del monorepo: `npm run prisma:migrate:deploy`, `npm run seed:admin`.

| Script | Función |
|--------|---------|
| `start.ps1` / `stop.ps1` | `pg_ctl` |
| `status.ps1` | `pg_ctl status` |
| `initdb.ps1` | Solo portable |
| `create-db.ps1` | Usuario y BD de la app |
| `backup.ps1` / `restore.ps1` | `pg_dump` / `pg_restore` |

## Modo service (instalador Windows)

1. Instale PostgreSQL con el instalador oficial y anote el nombre del servicio (p. ej. `postgresql-x64-16`).
2. En `postgres.local.config.json` use `"mode": "service"` y `serviceName`.
3. **No ejecute `initdb.ps1`**: el script avisa que no aplica; el clúster ya existe.
4. Arranque:

```powershell
.\start.ps1   # equivale a Start-Service
.\create-db.ps1   # crea bnb_app / bnb_tickets vía psql si no existen
```

`stop.ps1` y `status.ps1` usan el servicio Windows. `backup.ps1` y `restore.ps1` usan los binarios del instalador (`pgBin` o detección automática).

## Integración instalación offline

`scripts/offline/install-server.ps1` lee el modo: en **service** no invoca `pg_ctl`; en **portable** ejecuta `start.ps1` como antes. Ver [instalacion-offline.md](./instalacion-offline.md).

## Autenticación

En modo portable, `initdb` configura **scram-sha-256**. En modo service, use la política del instalador.

## Enlaces

- [deployment-windows.md](./deployment-windows.md) — variables `.env` y arranque del API.
- [backup-restore.md](./backup-restore.md) — respaldos con los mismos scripts en ambos modos.