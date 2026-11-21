<#
.SYNOPSIS
    Arma el paquete offline en la máquina Windows CON internet (misma arquitectura que el servidor).

.DESCRIPTION
    Ejecuta npm ci, genera el cliente Prisma (incl. engine windows), compila los workspaces
    y crea un ZIP versionado con node_modules, dist, schema y manifiesto de integridad.
    Debe correrse en win32-x64 con Node >= 20 (misma major que en producción).
#>
param(
    [string]$OutputDir = ".\dist-offline",
    [string]$Version = $(Get-Date -Format "yyyyMMdd-HHmmss")
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$name' en PATH. Instale Node.js LTS >= 20."
    }
}

Write-Host "=== BNB_Ticket — empaquetado offline ===" -ForegroundColor Cyan
Require-Command node
Require-Command npm

$nodeVersion = node -v
Write-Host "Node detectado: $nodeVersion"

Push-Location $RepoRoot
try {
  . (Join-Path $RepoRoot "scripts\Load-BnbDotEnv.ps1")

  if (-not (Test-Path "package-lock.json")) {
    throw "Falta package-lock.json. Ejecute 'npm install' en la raíz y commitee el lockfile."
  }

  Write-Host "→ npm ci (reproducible, incluye devDependencies necesarias para build y Prisma)..." -ForegroundColor Yellow
  npm ci

  # prisma validate exige DATABASE_URL aunque no conecte a la BD
  if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://build:build@127.0.0.1:5432/bnb_build?schema=public"
    Write-Host "DATABASE_URL no definida; usando URL ficticia solo para validación/generate." -ForegroundColor DarkYellow
  }

  Write-Host "→ prisma validate + generate (binaryTargets native + windows)..." -ForegroundColor Yellow
  npm run prisma:validate
  npm run prisma:generate

  Write-Host "→ build de @bnb/shared, @bnb/api y @bnb/web..." -ForegroundColor Yellow
  npm run build

  $staging = Join-Path $RepoRoot "dist-offline\staging-$Version"
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging | Out-Null

  # Copia selectiva: código fuente necesario en prod + artefactos compilados
  $pathsToCopy = @(
    "package.json",
    "package-lock.json",
    "apps\api\package.json",
    "apps\api\dist",
    "apps\api\prisma",
    "apps\web\package.json",
    "apps\web\dist",
    "packages\shared\package.json",
    "packages\shared\dist",
    ".env.example",
    "scripts\offline",
    "scripts\postgres",
    "storage"
  )

  foreach ($rel in $pathsToCopy) {
    $src = Join-Path $RepoRoot $rel
    if (-not (Test-Path $src)) {
      Write-Warning "Omite (no existe): $rel"
      continue
    }
    $dest = Join-Path $staging $rel
    $destParent = Split-Path $dest -Parent
    if (-not (Test-Path $destParent)) { New-Item -ItemType Directory -Path $destParent -Force | Out-Null }
    Copy-Item -Path $src -Destination $dest -Recurse -Force
  }

  Write-Host "→ Copiando node_modules completo (requerido para Argon2 y Prisma en servidor sin red)..." -ForegroundColor Yellow
  Copy-Item -Path (Join-Path $RepoRoot "node_modules") -Destination (Join-Path $staging "node_modules") -Recurse -Force

  # Manifiesto con versión de Node y hash SHA256 del zip
  if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }
  $zipName = "bnb-ticket-offline-$Version-win32-x64.zip"
  $zipPath = Join-Path (Resolve-Path $OutputDir) $zipName

  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Compress-Archive -Path "$staging\*" -DestinationPath $zipPath -CompressionLevel Optimal

  $hash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
  $manifest = [ordered]@{
    packageVersion = (Get-Content (Join-Path $RepoRoot "package.json") | ConvertFrom-Json).version
    buildId        = $Version
    builtAt        = (Get-Date).ToUniversalTime().ToString("o")
    nodeVersion      = $nodeVersion
    platform         = "win32-x64"
    archiveFile      = $zipName
    sha256           = $hash
    notes            = "Generado con npm ci + prisma generate + npm run build. No ejecutar npm install en el servidor."
  }
  $manifestPath = Join-Path $OutputDir "manifest-$Version.json"
  $manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8

  Write-Host "`n[OK] Paquete: $zipPath" -ForegroundColor Green
  Write-Host "[OK] Manifiesto: $manifestPath (SHA256: $hash)" -ForegroundColor Green
}
finally {
  Pop-Location
}