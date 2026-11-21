# Genera secretos en .env sin mostrarlos (invoca el mismo .mjs que generar-secretos.sh).
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path $here 'generar-secretos.mjs') @args