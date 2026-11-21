#!/usr/bin/env bash
# Comprueba DATABASE_URL y contraseña antes de npm run test:integration.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/cargar-env.sh
source "${ROOT}/scripts/lib/cargar-env.sh"

bnb_cargar_dotenv_monorepo "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] Falta DATABASE_URL en .env (raíz o apps/api/.env)." >&2
  exit 1
fi

if [[ -z "${DEMO_SEED_PASSWORD:-}" && -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "[ERROR] Defina DEMO_SEED_PASSWORD (recomendado tras seed:demo) o ADMIN_PASSWORD (tras seed:admin) en el .env raíz." >&2
  echo "        Véase docs/pruebas-integracion.md" >&2
  exit 1
fi

echo "[OK] Entorno listo para test:integration (DATABASE_URL y contraseña presentes)."