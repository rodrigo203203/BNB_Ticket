# Módulo compartido: carga de configuración y rutas a binarios portables de PostgreSQL.
# Las contraseñas NUNCA van en archivos versionados: usar variables de entorno.

function Get-BnbPostgresConfig {
    param(
        [string]$ConfigPath = (Join-Path $PSScriptRoot "postgres.local.config.json")
    )

    $defaults = [ordered]@{
        pgBin     = $env:PG_BIN
        pgData    = $env:PGDATA
        pgPort    = if ($env:PGPORT) { [int]$env:PGPORT } else { 5432 }
        superuser = if ($env:PGSUPERUSER) { $env:PGSUPERUSER } else { "postgres" }
        dbName    = if ($env:BNB_DB_NAME) { $env:BNB_DB_NAME } else { "bnb_tickets" }
        dbUser    = if ($env:BNB_DB_USER) { $env:BNB_DB_USER } else { "bnb_app" }
        backupDir = $env:BNB_PG_BACKUP_DIR
    }

    if (Test-Path $ConfigPath) {
        $fileCfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        foreach ($prop in $fileCfg.PSObject.Properties) {
            if ($null -ne $prop.Value -and "$prop.Value" -ne "") {
                $defaults[$prop.Name] = $prop.Value
            }
        }
    }

    if (-not $defaults.pgBin) {
        throw "Falta pgBin: defina PG_BIN o postgres.local.config.json (ver postgres.config.example.json)."
    }
    if (-not $defaults.pgData) {
        throw "Falta pgData: defina PGDATA o postgres.local.config.json."
    }
    if (-not $defaults.backupDir) {
        $defaults.backupDir = Join-Path (Split-Path $defaults.pgData -Parent) "backups"
    }

    return [pscustomobject]$defaults
}

function Get-PgExecutable {
    param(
        [Parameter(Mandatory)] [string]$PgBin,
        [Parameter(Mandatory)] [string]$Name
    )
    $exe = Join-Path $PgBin "$Name.exe"
    if (-not (Test-Path $exe)) {
        throw "No se encontró $exe. Verifique la ruta pgBin del zip portable."
    }
    return $exe
}

function Get-SuperuserPassword {
  <#
    Contraseña del superusuario (p. ej. postgres tras initdb).
    Orden: POSTGRES_SUPERUSER_PASSWORD, PGPASSWORD, solicitud segura.
  #>
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
  <#
    Contraseña del usuario de aplicación (bnb_app).
    Orden: BNB_DB_PASSWORD, solicitud segura.
  #>
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
