#!/usr/bin/env bash
# Comprueba binarios win32-x64 obligatorios en un directorio de paquete (staging).
set -euo pipefail

verificar_binarios_win_paquete() {
  local root="${1:?Ruta del staging (node_modules)}"
  local faltan=0

  if ! find "$root" -name 'query_engine-windows.dll.node' -print -quit 2>/dev/null | grep -q .; then
    echo "[ERROR] Falta query_engine-windows.dll.node (Prisma)." >&2
    faltan=1
  fi

  if ! find "$root" -path '*argon2-win32-x64-msvc*' -print -quit 2>/dev/null | grep -q .; then
    echo "[ERROR] Falta el prebuild @node-rs/argon2-win32-x64-msvc." >&2
    faltan=1
  fi

  if ! find "$root" -name 'schema-engine-windows.exe' -print -quit 2>/dev/null | grep -q .; then
    echo "[ERROR] Falta schema-engine-windows.exe (Prisma)." >&2
    faltan=1
  fi

  if [[ "$faltan" -ne 0 ]]; then
    echo "Genere el ZIP en Windows x64 con: npm run prisma:generate && bash scripts/offline/build-package.sh" >&2
    return 1
  fi
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  verificar_binarios_win_paquete "${1:-.}"
fi