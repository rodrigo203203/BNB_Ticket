<#
.SYNOPSIS
    Inicializa un clúster PostgreSQL portable con autenticación scram-sha-256.
#>
param([string]$ConfigPath)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\Postgres-Config.ps1"

$cfg = Get-BnbPostgresConfig -ConfigPath $ConfigPath
$initdb = Get-PgExecutable -PgBin $cfg.pgBin -Name "initdb"

if (Test-Path $cfg.pgData) {
    $entries = Get-ChildItem -Path $cfg.pgData -ErrorAction SilentlyContinue
    if ($entries) {
        throw "PGDATA no está vacío: $($cfg.pgData). Use otra ruta o elimine el directorio si es seguro."
    }
} else {
    New-Item -ItemType Directory -Path $cfg.pgData -Force | Out-Null
}

$superPass = Get-SuperuserPassword
$pwFile = New-TemporaryFile
try {
    # initdb --pwfile no acepta línea vacía; escribimos contraseña en archivo temporal
    Set-Content -Path $pwFile.FullName -Value $superPass -NoNewline -Encoding ASCII

    Write-Host "→ initdb en $($cfg.pgData) (auth scram-sha-256)..." -ForegroundColor Yellow
    & $initdb `
        -D $cfg.pgData `
        -U $cfg.superuser `
        --pwfile="$($pwFile.FullName)" `
        --auth-host=scram-sha-256 `
        --auth-local=scram-sha-256 `
        -E UTF8 `
        --locale=C

    if ($LASTEXITCODE -ne 0) { throw "initdb falló con código $LASTEXITCODE" }

    Write-Host "[OK] Clúster inicializado. Siguiente: .\start.ps1 y luego .\create-db.ps1" -ForegroundColor Green
}
finally {
    Remove-Item $pwFile.FullName -Force -ErrorAction SilentlyContinue
    # No dejar la contraseña en variables más de lo necesario
    $superPass = $null
}