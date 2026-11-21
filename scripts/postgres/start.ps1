<#
.SYNOPSIS
    Arranca PostgreSQL: pg_ctl (portable) o servicio Windows (service).
#>
param(
    [string]$ConfigPath,
    [switch]$Wait
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
Start-BnbPostgresServer -Cfg $cfg

if ($Wait) { Start-Sleep -Seconds 2 }