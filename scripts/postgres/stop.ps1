<#
.SYNOPSIS
    Detiene PostgreSQL: pg_ctl (portable) o servicio Windows (service).
#>
param([string]$ConfigPath)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
Stop-BnbPostgresServer -Cfg $cfg