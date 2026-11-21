#!/usr/bin/env bash
# Prueba del cargador seguro de .env (sin ejecución de comandos embebidos).
set -euo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=cargar-env.sh
source "${LIB_DIR}/cargar-env.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PWNED="${TMP}/pwned"
rm -f "$PWNED"

ENV_FILE="${TMP}/malicioso.env"
cat >"$ENV_FILE" <<'ENVEOF'
# comentario
ADMIN_FULL_NAME=Administrador del Sistema
ADMIN_QUOTED="doble comilla y =iguales="
ADMIN_SINGLE='comilla simple'
export EXPORTED_KEY=valor_exportado
KEY=parte=resto=con=igual
MALICIOUS=$(touch PWNED_PLACEHOLDER)
EVIL=del
CRLF_TEST=linea_crlf
ENVEOF
# Insertar CRLF y ruta del honeypot
sed -i "s|PWNED_PLACEHOLDER|${PWNED}|g" "$ENV_FILE"
printf 'CRLF_TEST=desde_crlf\r\n' >>"$ENV_FILE"

unset ADMIN_FULL_NAME ADMIN_QUOTED ADMIN_SINGLE EXPORTED_KEY KEY MALICIOUS EVIL CRLF_TEST 2>/dev/null || true

bnb_cargar_dotenv_archivo "$ENV_FILE" true

[[ "${ADMIN_FULL_NAME:-}" == "Administrador del Sistema" ]] || {
  echo "ADMIN_FULL_NAME incorrecto: [${ADMIN_FULL_NAME:-}]" >&2
  exit 1
}
[[ "${ADMIN_QUOTED:-}" == "doble comilla y =iguales=" ]] || exit 1
[[ "${ADMIN_SINGLE:-}" == "comilla simple" ]] || exit 1
[[ "${EXPORTED_KEY:-}" == "valor_exportado" ]] || exit 1
[[ "${KEY:-}" == "parte=resto=con=igual" ]] || exit 1
esperado_malicioso='$(touch '"$PWNED"')'
[[ "${MALICIOUS:-}" == "$esperado_malicioso" ]] || {
  echo "MALICIOUS debe ser literal, fue: [${MALICIOUS:-}]" >&2
  exit 1
}
[[ "${EVIL:-}" == "del" ]] || exit 1
[[ "${CRLF_TEST:-}" == "desde_crlf" ]] || exit 1

if [[ -e "$PWNED" ]]; then
  echo "Se ejecutó un comando del .env (touch detectado)." >&2
  exit 1
fi

# Precedencia monorepo: raíz y apps/api/.env
MINI="${TMP}/mini"
mkdir -p "${MINI}/apps/api"
echo 'PORT=3000' >"${MINI}/.env"
echo 'PORT=3005' >"${MINI}/apps/api/.env"
unset PORT 2>/dev/null || true
bnb_cargar_dotenv_monorepo "$MINI"
[[ "${PORT:-}" == "3005" ]] || {
  echo "Precedencia apps/api/.env falló: PORT=${PORT:-}" >&2
  exit 1
}

echo "[OK] cargar-env.sh: valores con espacios, CRLF, comillas y sin ejecución de comandos."