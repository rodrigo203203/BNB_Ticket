<#
.SYNOPSIS
    Restaura un respaldo (.dump custom) con pg_restore.
#>
param(
    [Parameter(Mandatory)] [string]$DumpPath,
    [string]$ConfigPath,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

if (-not (Test-Path $DumpPath)) { throw "No existe el archivo: $DumpPath" }

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$pgRestore = Get-PgExecutable -PgBin $cfg.pgBin -Name "pg_restore"
$superPass = Get-SuperuserPassword

$prev = $env:PGPASSWORD
$env:PGPASSWORD = $superPass
try {
    $args = @("-h", "localhost", "-p", $cfg.pgPort, "-U", $cfg.superuser, "-d", $cfg.dbName, "-v")
    if ($Clean) { $args += @("--clean", "--if-exists") }
    $args += $DumpPath

    & $pgRestore @args
    if ($LASTEXITCODE -ne 0) { throw "pg_restore falló con código $LASTEXITCODE" }
    Write-Host "[OK] Restauración completada en $($cfg.dbName)" -ForegroundColor Green
} finally {
    if ($null -eq $prev) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    else { $env:PGPASSWORD = $prev }
}