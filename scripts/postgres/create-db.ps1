<#
.SYNOPSIS
    Crea el usuario y la base de datos de la aplicación BNB_Ticket.
#>
param([string]$ConfigPath)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$superPass = Get-SuperuserPassword
$appPass = Get-AppDbPassword

$safeAppPass = $appPass.Replace("'", "''")
$dbUser = $cfg.dbUser
$dbName = $cfg.dbName

$roleSql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$dbUser') THEN
    CREATE ROLE $dbUser LOGIN PASSWORD '$safeAppPass';
  ELSE
    ALTER ROLE $dbUser WITH LOGIN PASSWORD '$safeAppPass';
  END IF;
END
`$`$;
"@

Invoke-Psql -PgBin $cfg.pgBin -PgData $cfg.pgData -Port $cfg.pgPort -User $cfg.superuser -Password $superPass -Database "postgres" -Sql $roleSql

$dbExistsSql = "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
# Crear base si no existe (no hay CREATE DATABASE IF NOT EXISTS en versiones viejas; usamos consulta)
$check = & {
    $psql = Get-PgExecutable -PgBin $cfg.pgBin -Name "psql"
    $env:PGPASSWORD = $superPass
    try {
        & $psql -h localhost -p $cfg.pgPort -U $cfg.superuser -d postgres -tAc $dbExistsSql
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

if ($check.Trim() -ne "1") {
    Invoke-Psql -PgBin $cfg.pgBin -PgData $cfg.pgData -Port $cfg.pgPort -User $cfg.superuser -Password $superPass -Database "postgres" -Sql "CREATE DATABASE $dbName OWNER $dbUser;"
}

Invoke-Psql -PgBin $cfg.pgBin -PgData $cfg.pgData -Port $cfg.pgPort -User $cfg.superuser -Password $superPass -Database "postgres" -Sql "GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;"

Write-Host @"
[OK] Base lista. Configure DATABASE_URL en .env, por ejemplo:
postgresql://${dbUser}:<BNB_DB_PASSWORD>@localhost:$($cfg.pgPort)/${dbName}?schema=public
"@ -ForegroundColor Green