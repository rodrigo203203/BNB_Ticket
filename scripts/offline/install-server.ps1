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

$pgScripts = Join-Path $InstallDir "scripts\postgres"
$pgStart = Join-Path $pgScripts "start.ps1"
$configModule = Join-Path $pgScripts "Postgres-Config.ps1"
$pgMode = 'portable'
if (Test-Path $configModule) {
    . $configModule
    $pgMode = Get-BnbPostgresModeFromInstallDir -InstallDir $InstallDir
}

if (Test-Path $pgStart) {
    if ($pgMode -eq 'service') {
        Write-Host "→ Modo PostgreSQL: service (no se usa pg_ctl desde install-server)." -ForegroundColor Yellow
        Write-Host "  Ejecute scripts\postgres\start.ps1 si el servicio no está en ejecución." -ForegroundColor Yellow
    } else {
        Write-Host "→ Iniciando PostgreSQL portable (pg_ctl)..." -ForegroundColor Yellow
        & powershell -NoProfile -ExecutionPolicy Bypass -File $pgStart
    }
} else {
    Write-Warning "No se encontró $pgStart. Configure postgres.local.config.json y ejecute start.ps1 manualmente."
}

Write-Host @"

Próximos pasos (sin red):
  1. Editar $envFile (DATABASE_URL con BNB_DB_USER/BNB_DB_PASSWORD, JWT, CORS, etc.)
  2. Si es instalación nueva portable: initdb.ps1 y create-db.ps1 (modo service: solo create-db.ps1). Ver docs/postgres.md
  3. npm run prisma:migrate:deploy y npm run seed:admin (desde la raíz del paquete)
  4. Arrancar API:
       cd $InstallDir\apps\api
       node dist\src\main.js
  5. Servir apps\web\dist con IIS (docs/deployment-windows.md)

"@ -ForegroundColor Cyan