# Estrategia de Respaldo y Recuperación (PostgreSQL y Archivos)

Este documento detalla las políticas y procedimientos técnicos para la protección de datos, respaldos periódicos y recuperación ante desastres (Disaster Recovery) de la plataforma en la infraestructura del Banco Nacional de Bolivia (BNB).

---

## 1. Política de Respaldos de PostgreSQL

- **Frecuencia:**
  - **Respaldo Completo (Full Backup):** Diario a las 01:00 AM (ventana de menor actividad operativa).
  - **Respaldo de Transacciones (WAL Archives):** Continuo para permitir Point-in-Time Recovery (PITR) si las políticas de infraestructura lo requieren.
- **Retención:**
  - Respaldos diarios: Conservar durante 30 días.
  - Respaldos de fin de mes: Conservar durante 12 meses.
  - Respaldos anuales: Conservar por 5 años (cumplimiento normativo ASFI).

---

## 2. Procedimiento de Respaldo (PostgreSQL portable)

En Windows con binarios portables, use los scripts del proyecto (contraseña solo por entorno):

```powershell
cd D:\Aplicaciones\BNB_GerenciaDatos\scripts\postgres
$env:POSTGRES_SUPERUSER_PASSWORD = "<desde gestor de secretos>"
.\backup.ps1
```

El respaldo custom (`.dump`) se guarda en `backupDir` del archivo `postgres.local.config.json` (ver [postgres-portable.md](./postgres-portable.md)).

### Respaldo manual con `pg_dump` (misma carpeta `pgBin`):

```bash
# Formato binario con compresión nativa — ejecutar desde PG_BIN del zip portable
pg_dump -h localhost -p 5432 -U <PG_USER> -F c -b -v -f "bnb_tickets_dev_$(date +%Y%m%d_%H%M%S).dump" bnb_tickets_dev
```

### Respaldo en Formato SQL Plano (Texto Legible):
```bash
pg_dump -h localhost -p 5432 -U <PG_USER> -F p -v -f "bnb_tickets_dev_backup.sql" bnb_tickets_dev
```

---

## 3. Script alternativo (Programador de tareas)

Si no usa `scripts/postgres/backup.ps1`, puede programar una tarea que invoque `pg_dump.exe` del **mismo zip portable** (`PG_BIN`):

```powershell
# Parámetros de configuración
$DbName = "bnb_tickets_dev"
# Usuario de PostgreSQL: definir en .env o como variable de entorno (no hardcodear en el repo)
$DbUser = $env:PGUSER
if (-not $DbUser) { $DbUser = "<PG_USER>" }
$BackupDir = "D:\Backups\BNB_Tickets"
$DateStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\${DbName}_${DateStamp}.dump"
$PgDumpPath = "$env:PG_BIN\pg_dump.exe"

# Asegurar existencia del directorio de destino
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Ejecutar el respaldo
# Contraseña: exportar PGPASSWORD en el entorno del servidor (equivalente a <PG_PASSWORD> en docs)
if (-not $env:PGPASSWORD) {
    Write-Warning "Defina la variable PGPASSWORD antes de ejecutar el respaldo."
}
& $PgDumpPath -h localhost -p 5432 -U $DbUser -F c -b -f $BackupFile $DbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Respaldo completado con éxito: $BackupFile"
} else {
    Write-Error "[ERROR] Falló la ejecución de pg_dump con código $LASTEXITCODE"
}

# Rotación: Eliminar respaldos con más de 30 días de antigüedad
Get-ChildItem -Path $BackupDir -Filter "*.dump" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
```

---

## 4. Procedimiento de Restauración

### Restauración desde Formato Personalizado (`pg_restore`):
```bash
# 1. Crear base de datos limpia si es necesario
psql -h localhost -U <PG_USER> -d postgres -c "CREATE DATABASE bnb_tickets_dev;"

# 2. Restaurar contenido completo
pg_restore -h localhost -p 5432 -U <PG_USER> -d bnb_tickets_dev -v --clean --if-exists "bnb_tickets_dev_backup.dump"
```

### Restauración desde Archivo SQL:
```bash
psql -h localhost -U <PG_USER> -d bnb_tickets_dev -f "bnb_tickets_dev_backup.sql"
```

---

## 5. Respaldo de Almacenamiento Local (`storage/`)

El directorio `storage/` contiene los archivos y registros temporales de la plataforma:
- Se debe sincronizar diariamente mediante copia en espejo (Robocopy en Windows o rsync) hacia un almacenamiento NAS corporativo de respaldo.
```powershell
robocopy "D:\Aplicaciones\BNB_GerenciaDatos\storage" "\\nas-backup.bnb.com.bo\Backups\Tickets_Storage" /MIR /R:3 /W:5
```

