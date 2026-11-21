<#
.SYNOPSIS
    Arranca PostgreSQL portable con pg_ctl.
#>
param(
    [string]$ConfigPath,
    [switch]$Wait
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$pgCtl = Get-PgExecutable -PgBin $cfg.pgBin -Name "pg_ctl"
$logFile = Join-Path $cfg.pgData "log\postgresql.log"
$logDir = Split-Path $logFile -Parent
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

& $pgCtl start -D $cfg.pgData -l $logFile -o "-p $($cfg.pgPort)"
if ($LASTEXITCODE -ne 0) { throw "pg_ctl start falló con código $LASTEXITCODE" }

if ($Wait) {
    Start-Sleep -Seconds 2
}

Write-Host "[OK] PostgreSQL escuchando en localhost:$($cfg.pgPort)" -ForegroundColor Green