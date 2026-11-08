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

## 2. Procedimiento de Respaldo Manual con `pg_dump`

### Respaldo en Formato Personalizado Comprimido (Recomendado):
```bash
# Formato binario con compresión nativa
pg_dump -h localhost -p 5432 -U rodrigo203 -F c -b -v -f "bnb_tickets_dev_$(date +%Y%m%d_%H%M%S).dump" bnb_tickets_dev
```

### Respaldo en Formato SQL Plano (Texto Legible):
```bash
pg_dump -h localhost -p 5432 -U rodrigo203 -F p -v -f "bnb_tickets_dev_backup.sql" bnb_tickets_dev
```

---

## 3. Script Automatizado para Windows Server (PowerShell)

Guardar como `D:\Aplicaciones\Scripts\Backup-BNBTickets.ps1` y programar en el **Programador de Tareas de Windows (Task Scheduler)**:

```powershell
# Parámetros de configuración
$DbName = "bnb_tickets_dev"
$DbUser = "rodrigo203"
$BackupDir = "D:\Backups\BNB_Tickets"
$DateStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\${DbName}_${DateStamp}.dump"
$PgDumpPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"

# Asegurar existencia del directorio de destino
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Ejecutar el respaldo
$env:PGPASSWORD = "XboxOne"
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
psql -h localhost -U rodrigo203 -d postgres -c "CREATE DATABASE bnb_tickets_dev;"

# 2. Restaurar contenido completo
pg_restore -h localhost -p 5432 -U rodrigo203 -d bnb_tickets_dev -v --clean --if-exists "bnb_tickets_dev_backup.dump"
```

### Restauración desde Archivo SQL:
```bash
psql -h localhost -U rodrigo203 -d bnb_tickets_dev -f "bnb_tickets_dev_backup.sql"
```

---

## 5. Respaldo de Almacenamiento Local (`storage/`)

El directorio `storage/` contiene los archivos y registros temporales de la plataforma:
- Se debe sincronizar diariamente mediante copia en espejo (Robocopy en Windows o rsync) hacia un almacenamiento NAS corporativo de respaldo.
```powershell
robocopy "D:\Aplicaciones\BNB_GerenciaDatos\storage" "\\nas-backup.bnb.com.bo\Backups\Tickets_Storage" /MIR /R:3 /W:5
```

