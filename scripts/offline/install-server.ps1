<#
.SYNOPSIS
    Instala y prepara BNB_Ticket en el servidor Windows SIN internet.

.DESCRIPTION
    Valida Node, comprueba el hash SHA256 del zip, descomprime y crea .env desde .env.example.
    NO ejecuta npm install ni comandos que requieran red.
    Enganche Postgres portable: ver docs/instalacion-offline.md (fase T2 — scripts postgres/).
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [string]$Sha256Expected,

    [string]$InstallDir = "D:\Aplicaciones\BNB_Tickets",

    [string]$ManifestPath
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$name'. El servidor debe tener Node.js x64 (misma major que la máquina de build)."
    }
}

Write-Host "=== BNB_Ticket — instalación offline en servidor ===" -ForegroundColor Cyan
Require-Command node

if (-not (Test-Path $ZipPath)) {
    throw "No existe el archivo: $ZipPath"
}

if ($ManifestPath -and (Test-Path $ManifestPath)) {
    $manifest = Get-Content $ManifestPath | ConvertFrom-Json
    if (-not $Sha256Expected) { $Sha256Expected = $manifest.sha256 }
    $expectedNode = $manifest.nodeVersion
    $currentNode = node -v
    if ($expectedNode -and ($expectedNode.Split('.')[0] -ne $currentNode.Split('.')[0])) {
        Write-Warning "La major de Node difiere: build=$expectedNode servidor=$currentNode"
    }
}

$actualHash = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash
if ($Sha256Expected -and ($actualHash.ToLower() -ne $Sha256Expected.ToLower())) {
    throw "Hash SHA256 no coincide. Esperado=$Sha256Expected Actual=$actualHash"
}
Write-Host "Hash SHA256 verificado." -ForegroundColor Green

if (Test-Path $InstallDir) {
    Write-Warning "El directorio $InstallDir ya existe; se fusionará el contenido del zip."
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "Descomprimiendo en $InstallDir ..." -ForegroundColor Yellow
Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force

$envExample = Join-Path $InstallDir ".env.example"
$envFile = Join-Path $InstallDir ".env"
if ((Test-Path $envExample) -and (-not (Test-Path $envFile))) {
    Copy-Item $envExample $envFile
    Write-Host "Creado .env desde .env.example — configure DATABASE_URL y secretos antes de arrancar." -ForegroundColor Yellow
}

# --- Enganche PostgreSQL portable (fase posterior) ---
# Antes de iniciar el API: ejecutar scripts/postgres/start.ps1 y asegurar DATABASE_URL.
Write-Host @"

Próximos pasos (sin red):
  1. Editar $envFile (DATABASE_URL, JWT, CORS, etc.)
  2. Iniciar PostgreSQL portable cuando exista scripts/postgres/ (T2)
  3. Arrancar API:
       cd $InstallDir\apps\api
       node dist\src\main.js
  4. Servir apps\web\dist con IIS (ver docs/deployment-windows.md)

"@ -ForegroundColor Cyan