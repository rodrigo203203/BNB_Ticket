<#
.SYNOPSIS
    Muestra el estado del servidor con pg_ctl status.
#>
param([string]$ConfigPath)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$pgCtl = Get-PgExecutable -PgBin $cfg.pgBin -Name "pg_ctl"

& $pgCtl status -D $cfg.pgData
exit $LASTEXITCODE