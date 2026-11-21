#!/usr/bin/env bash
# Instala el ZIP offline en servidor Windows (Git Bash). Sin npm install ni red.
set -euo pipefail

usage() {
  echo "Uso: $0 <ruta-al-zip> [directorio-instalacion] [sha256-esperado]" >&2
  exit 1
}

[[ $# -ge 1 ]] || usage
ZIP_PATH="$1"
INSTALL_DIR="${2:-D:/Aplicaciones/BNB_Tickets}"
SHA_EXPECT="${3:-}"

[[ -f "$ZIP_PATH" ]] || { echo "No existe: $ZIP_PATH" >&2; exit 1; }
command -v node >/dev/null || { echo "Instale Node.js x64 >= 20." >&2; exit 1; }

if [[ -n "$SHA_EXPECT" ]] && command -v sha256sum >/dev/null; then
  ACTUAL="$(sha256sum "$ZIP_PATH" | awk '{print $1}')"
  [[ "${ACTUAL,,}" == "${SHA_EXPECT,,}" ]] || { echo "SHA256 no coincide." >&2; exit 1; }
  echo "SHA256 verificado."
fi

mkdir -p "$INSTALL_DIR"
command -v unzip >/dev/null || { echo "Instale unzip (Git Bash)." >&2; exit 1; }
unzip -oq "$ZIP_PATH" -d "$INSTALL_DIR"

ENV_EX="${INSTALL_DIR}/.env.example"
ENV_FILE="${INSTALL_DIR}/.env"
if [[ -f "$ENV_EX" && ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EX" "$ENV_FILE"
  echo "Creado .env desde .env.example — configure DATABASE_URL y secretos."
fi

echo "[OK] Instalado en $INSTALL_DIR"
echo "PostgreSQL: scripts/postgres/init.sh → start.sh → create-db.sh (Git Bash)"
echo "Migraciones: cd $INSTALL_DIR && npm run prisma:migrate:deploy"
echo "API: node apps/api/dist/src/main.js"