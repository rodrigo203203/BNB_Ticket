# Módulo compartido: configuración PostgreSQL en modo portable (zip + pg_ctl) o servicio Windows.
# Contraseñas NUNCA en archivos versionados: usar variables de entorno.

$script:BnbPostgresModes = @('portable', 'service')

function Resolve-BnbPostgresMode {
    param([hashtable]$Cfg)
    $fromEnv = $env:PG_MODE
    if ($fromEnv -and $script:BnbPostgresModes -contains $fromEnv.ToLower()) {
        return $fromEnv.ToLower()
    }
    if ($Cfg.mode) {
        $m = "$($Cfg.mode)".ToLower()
        if ($script:BnbPostgresModes -contains $m) { return $m }
        throw "mode inválido en config: $($Cfg.mode). Use 'portable' o 'service'."
    }
    return 'portable'
}

function Resolve-PgBinPath {
    param(
        [string]$ExplicitBin,
        [string]$Mode
    )
    if ($ExplicitBin -and (Test-Path (Join-Path $ExplicitBin "psql.exe"))) {
        return $ExplicitBin
    }
    if ($Mode -eq 'service') {
        $candidates = @(
            $env:PG_BIN,
            (Join-Path ${env:ProgramFiles} "PostgreSQL\16\bin"),
            (Join-Path ${env:ProgramFiles} "PostgreSQL\15\bin"),
            (Join-Path ${env:ProgramFiles} "PostgreSQL\14\bin")
        ) | Where-Object { $_ }
        foreach ($c in $candidates) {
            if (Test-Path (Join-Path $c "psql.exe")) { return $c }
        }
        throw "Modo service: defina pgBin en postgres.local.config.json, PG_BIN, o instale PostgreSQL en Program Files."
    }
    throw "Falta pgBin: defina PG_BIN o postgres.local.config.json (ver postgres.config.example.json)."
}

function Assert-BnbPostgresPortableMode {
    param([pscustomobject]$Cfg)
    if ($Cfg.mode -ne 'portable') {
        throw @"
initdb y pg_ctl solo aplican en modo portable (zip).
Modo actual: $($Cfg.mode). En modo service el clúster lo administra el instalador de PostgreSQL;
use la consola del instalador o createdb del servicio existente.
"@
    }
}

function Get-BnbPostgresConfig {
    param(
        [string]$ConfigPath = (Join-Path $PSScriptRoot "postgres.local.config.json")
    )

    $raw = [ordered]@{
        mode         = $null
        serviceName  = $null
        pgBin        = $env:PG_BIN
        pgData       = $env:PGDATA
        pgPort       = if ($env:PGPORT) { [int]$env:PGPORT } else { 5432 }
        superuser    = if ($env:PGSUPERUSER) { $env:PGSUPERUSER } else { "postgres" }
        dbName       = if ($env:BNB_DB_NAME) { $env:BNB_DB_NAME } else { "bnb_tickets" }
        dbUser       = if ($env:BNB_DB_USER) { $env:BNB_DB_USER } else { "bnb_app" }
        backupDir    = $env:BNB_PG_BACKUP_DIR
    }

    if (Test-Path $ConfigPath) {
        $fileCfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        foreach ($prop in $fileCfg.PSObject.Properties) {
            if ($null -ne $prop.Value -and "$prop.Value" -ne "") {
                $raw[$prop.Name] = $prop.Value
            }
        }
    }

    $mode = Resolve-BnbPostgresMode -Cfg $raw
    if (-not $raw.serviceName) {
        $raw.serviceName = 'postgresql-x64-16'
    }

    $pgBin = Resolve-PgBinPath -ExplicitBin $raw.pgBin -Mode $mode
    if ($mode -eq 'portable' -and -not $raw.pgData) {
        throw "Falta pgData: defina PGDATA o postgres.local.config.json."
    }

    if (-not $raw.backupDir) {
        if ($raw.pgData) {
            $raw.backupDir = Join-Path (Split-Path $raw.pgData -Parent) "backups"
        } else {
            $raw.backupDir = Join-Path $env:ProgramData "BNB\postgres\backups"
        }
    }

    return [pscustomobject]@{
        mode        = $mode
        serviceName = $raw.serviceName
        pgBin       = $pgBin
        pgData      = $raw.pgData
        pgPort      = [int]$raw.pgPort
        superuser   = $raw.superuser
        dbName      = $raw.dbName
        dbUser      = $raw.dbUser
        backupDir   = $raw.backupDir
    }
}

function Get-PgExecutable {
    param(
        [Parameter(Mandatory)] [string]$PgBin,
        [Parameter(Mandatory)] [string]$Name
    )
    $exe = Join-Path $PgBin "$Name.exe"
    if (-not (Test-Path $exe)) {
        throw "No se encontró $exe. Verifique la ruta pgBin."
    }
    return $exe
}

function Get-BnbWindowsPostgresService {
    param([pscustomobject]$Cfg)
    $svc = Get-Service -Name $Cfg.serviceName -ErrorAction SilentlyContinue
    if (-not $svc) {
        throw "No se encontró el servicio Windows '$($Cfg.serviceName)'. Ajuste serviceName en la config."
    }
    return $svc
}

function Start-BnbPostgresServer {
    param([pscustomobject]$Cfg)
    if ($Cfg.mode -eq 'service') {
        $svc = Get-BnbWindowsPostgresService -Cfg $Cfg
        if ($svc.Status -eq 'Running') {
            Write-Host "[OK] Servicio $($Cfg.serviceName) ya está en ejecución." -ForegroundColor Green
            return
        }
        Start-Service -Name $Cfg.serviceName
        Write-Host "[OK] Servicio $($Cfg.serviceName) iniciado (localhost:$($Cfg.pgPort))." -ForegroundColor Green
        return
    }

    $pgCtl = Get-PgExecutable -PgBin $Cfg.pgBin -Name "pg_ctl"
    $logFile = Join-Path $Cfg.pgData "log\postgresql.log"
    $logDir = Split-Path $logFile -Parent
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    & $pgCtl start -D $Cfg.pgData -l $logFile -o "-p $($Cfg.pgPort)"
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl start falló con código $LASTEXITCODE" }
    Write-Host "[OK] PostgreSQL portable en localhost:$($Cfg.pgPort)" -ForegroundColor Green
}

function Stop-BnbPostgresServer {
    param([pscustomobject]$Cfg)
    if ($Cfg.mode -eq 'service') {
        $svc = Get-BnbWindowsPostgresService -Cfg $Cfg
        if ($svc.Status -eq 'Stopped') {
            Write-Host "[OK] Servicio $($Cfg.serviceName) ya está detenido." -ForegroundColor Green
            return
        }
        Stop-Service -Name $Cfg.serviceName -Force
        Write-Host "[OK] Servicio $($Cfg.serviceName) detenido." -ForegroundColor Green
        return
    }

    $pgCtl = Get-PgExecutable -PgBin $Cfg.pgBin -Name "pg_ctl"
    & $pgCtl stop -D $Cfg.pgData -m fast
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl stop falló con código $LASTEXITCODE" }
    Write-Host "[OK] PostgreSQL portable detenido." -ForegroundColor Green
}

function Show-BnbPostgresStatus {
    param([pscustomobject]$Cfg)
    Write-Host "Modo: $($Cfg.mode) | Puerto: $($Cfg.pgPort) | Bin: $($Cfg.pgBin)" -ForegroundColor Cyan
    if ($Cfg.mode -eq 'service') {
        $svc = Get-BnbWindowsPostgresService -Cfg $Cfg
        Write-Host "Servicio $($Cfg.serviceName): $($svc.Status)"
        if ($svc.Status -ne 'Running') { return 1 }
        return 0
    }

    $pgCtl = Get-PgExecutable -PgBin $Cfg.pgBin -Name "pg_ctl"
    & $pgCtl status -D $Cfg.pgData
    return $LASTEXITCODE
}

function Get-SuperuserPassword {
    if ($env:POSTGRES_SUPERUSER_PASSWORD) { return $env:POSTGRES_SUPERUSER_PASSWORD }
    if ($env:PGPASSWORD) { return $env:PGPASSWORD }

    $secure = Read-Host "Contraseña del superusuario PostgreSQL" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Get-AppDbPassword {
    if ($env:BNB_DB_PASSWORD) { return $env:BNB_DB_PASSWORD }

    $secure = Read-Host "Contraseña para el usuario de aplicación (BNB_DB_USER)" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Invoke-Psql {
    param(
        [string]$PgBin,
        [string]$PgData,
        [int]$Port,
        [string]$User,
        [string]$Password,
        [string]$Database = "postgres",
        [string]$Sql,
        [string]$File
    )
    $psql = Get-PgExecutable -PgBin $PgBin -Name "psql"
    $prev = $env:PGPASSWORD
    $env:PGPASSWORD = $Password
    $env:PGCLIENTENCODING = "UTF8"
    try {
        $args = @("-h", "localhost", "-p", $Port, "-U", $User, "-d", $Database, "-v", "ON_ERROR_STOP=1")
        if ($File) {
            & $psql @args "-f" $File
        } else {
            & $psql @args "-c" $Sql
        }
        if ($LASTEXITCODE -ne 0) { throw "psql finalizó con código $LASTEXITCODE" }
    } finally {
        if ($null -eq $prev) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        else { $env:PGPASSWORD = $prev }
    }
}

function Get-BnbPostgresModeFromInstallDir {
    param([string]$InstallDir)
    $local = Join-Path $InstallDir "scripts\postgres\postgres.local.config.json"
    if (-not (Test-Path $local)) { return 'portable' }
    try {
        $cfg = Get-BnbPostgresConfig -ConfigPath $local
        return $cfg.mode
    } catch {
        return 'portable'
    }
}