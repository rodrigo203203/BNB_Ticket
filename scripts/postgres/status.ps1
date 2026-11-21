<#
.SYNOPSIS
    Estado de PostgreSQL (pg_ctl status o servicio Windows).
#>
param([string]$ConfigPath)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$code = Show-BnbPostgresStatus -Cfg $cfg
exit $code