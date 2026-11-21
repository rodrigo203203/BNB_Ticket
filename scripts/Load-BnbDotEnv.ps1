# Carga .env de la raíz y apps/api con la misma precedencia que cargar-entorno.ts (override).
# Uso: . (Join-Path $PSScriptRoot 'Load-BnbDotEnv.ps1')

function Read-BnbDotEnvLine {
    param([string]$Line)
    if ($Line -match '^\s*#' -or $Line -match '^\s*$') { return $null }
    if ($Line -notmatch '^\s*([^=]+)=(.*)$') { return $null }
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    return @{ Name = $name; Value = $value }
}

function Import-BnbDotEnvFromFile {
    param([string]$FilePath)
    if (-not (Test-Path $FilePath)) { return }
    Get-Content -LiteralPath $FilePath -Encoding UTF8 | ForEach-Object {
        $parsed = Read-BnbDotEnvLine -Line $_
        if ($null -eq $parsed) { return }
        Set-Item -Path "env:$($parsed.Name)" -Value $parsed.Value
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$rootEnv = Join-Path $repoRoot '.env'
$apiEnv = Join-Path $repoRoot 'apps\api\.env'

Import-BnbDotEnvFromFile -FilePath $rootEnv
Import-BnbDotEnvFromFile -FilePath $apiEnv