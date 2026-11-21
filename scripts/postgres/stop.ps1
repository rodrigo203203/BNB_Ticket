<#
.SYNOPSIS
    Detiene PostgreSQL portable con pg_ctl.
#>
param([string]$ConfigPath)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$pgCtl = Get-PgExecutable -PgBin $cfg.pgBin -Name "pg_ctl"

& $pgCtl stop -D $cfg.pgData -m fast
if ($LASTEXITCODE -ne 0) { throw "pg_ctl stop falló con código $LASTEXITCODE" }

Write-Host "[OK] PostgreSQL detenido." -ForegroundColor Green