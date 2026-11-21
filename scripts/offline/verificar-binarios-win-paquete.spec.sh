#!/usr/bin/env bash
# Prueba unitaria del verificador (debe fallar sin binarios Windows).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=verificar-binarios-win-paquete.sh
source "${SCRIPT_DIR}/verificar-binarios-win-paquete.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if verificar_binarios_win_paquete "$TMP" 2>/dev/null; then
  echo "Se esperaba exit distinto de 0 en directorio vacío." >&2
  exit 1
fi

echo "[OK] verificar-binarios-win-paquete rechaza staging sin binarios."