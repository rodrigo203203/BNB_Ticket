<#
.SYNOPSIS
    Respaldo de la base con pg_dump (formato custom comprimido).
#>
param(
    [string]$ConfigPath,
    [string]$OutputFile
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
if (-not (Test-Path $cfg.backupDir)) {
    New-Item -ItemType Directory -Path $cfg.backupDir -Force | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not $OutputFile) {
    $OutputFile = Join-Path $cfg.backupDir "$($cfg.dbName)_$stamp.dump"
}

$pgDump = Get-PgExecutable -PgBin $cfg.pgBin -Name "pg_dump"
$superPass = Get-SuperuserPassword

$prev = $env:PGPASSWORD
$env:PGPASSWORD = $superPass
try {
    & $pgDump -h localhost -p $cfg.pgPort -U $cfg.superuser -F c -b -v -f $OutputFile $cfg.dbName
    if ($LASTEXITCODE -ne 0) { throw "pg_dump falló con código $LASTEXITCODE" }
    Write-Host "[OK] Respaldo: $OutputFile" -ForegroundColor Green
} finally {
    if ($null -eq $prev) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    else { $env:PGPASSWORD = $prev }
}