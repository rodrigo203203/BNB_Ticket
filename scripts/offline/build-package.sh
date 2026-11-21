#!/usr/bin/env bash
# Empaqueta BNB_Ticket para Windows x64 offline. Ejecutar en Windows Git Bash o WSL con Node >= 20.
set -euo pipefail

OUTPUT_DIR="${1:-./dist-offline}"
VERSION="${2:-$(date -u +%Y%m%d-%H%M%S)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

prisma_env() {
  export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
  unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy || true
}

echo "=== BNB_Ticket — empaquetado offline (bash) ==="
command -v node >/dev/null || { echo "Falta node en PATH." >&2; exit 1; }
echo "Node: $(node -v)"

cd "$REPO_ROOT"
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env"
  set +a
fi

[[ -f package-lock.json ]] || { echo "Falta package-lock.json." >&2; exit 1; }

echo "→ npm ci..."
npm ci

export DATABASE_URL="${DATABASE_URL:-postgresql://build:build@127.0.0.1:5432/bnb_build?schema=public}"

prisma_env
echo "→ prisma validate + generate..."
npm run prisma:validate
npm run prisma:generate

echo "→ npm run build..."
npm run build

STAGING="${REPO_ROOT}/dist-offline/staging-${VERSION}"
rm -rf "$STAGING"
mkdir -p "$STAGING"

PATHS=(
  package.json
  package-lock.json
  apps/api/package.json
  apps/api/dist
  apps/api/prisma
  apps/web/package.json
  apps/web/dist
  packages/shared/package.json
  packages/shared/dist
  .env.example
  scripts/offline
  scripts/postgres
  scripts/generar-secretos.mjs
  scripts/generar-secretos.sh
  storage
  docs/instalacion-offline.md
  docs/postgres.md
)

for rel in "${PATHS[@]}"; do
  src="${REPO_ROOT}/${rel}"
  if [[ ! -e "$src" ]]; then
    echo "Omite (no existe): $rel" >&2
    continue
  fi
  dest="${STAGING}/${rel}"
  mkdir -p "$(dirname "$dest")"
  cp -a "$src" "$dest"
done

echo "→ Copiando node_modules (binarios @node-rs/argon2 + Prisma windows)..."
cp -a "${REPO_ROOT}/node_modules" "${STAGING}/node_modules"

mkdir -p "$OUTPUT_DIR"
ZIP_NAME="bnb-ticket-offline-${VERSION}-win32-x64.zip"
ZIP_PATH="$(cd "$OUTPUT_DIR" && pwd)/${ZIP_NAME}"
( cd "$STAGING" && zip -rq "$ZIP_PATH" . )

HASH=""
if command -v sha256sum >/dev/null; then
  HASH="$(sha256sum "$ZIP_PATH" | awk '{print $1}')"
elif command -v shasum >/dev/null; then
  HASH="$(shasum -a 256 "$ZIP_PATH" | awk '{print $1}')"
fi

MANIFEST="${OUTPUT_DIR}/manifest-${VERSION}.json"
node -e "
const fs=require('fs');
const pkg=require('${REPO_ROOT}/package.json');
fs.writeFileSync('${MANIFEST}', JSON.stringify({
  packageVersion: pkg.version,
  buildId: '${VERSION}',
  builtAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: 'win32-x64',
  archiveFile: '${ZIP_NAME}',
  sha256: '${HASH}',
  notes: 'Generado con build-package.sh. Incluye engines Prisma windows en node_modules.',
}, null, 2));
"

echo ""
echo "[OK] Paquete: $ZIP_PATH"
echo "[OK] Manifiesto: $MANIFEST"
echo "Verificar engines Windows:"
find "${STAGING}/node_modules" -name '*query_engine-windows.dll.node' 2>/dev/null | head -n 3 || echo "(ejecute este script en Windows tras prisma generate para engines win32)"