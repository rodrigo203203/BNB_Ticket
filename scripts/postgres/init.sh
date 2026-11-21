#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=postgres-common.sh
source "${SCRIPT_DIR}/postgres-common.sh"

bnb_cargar_dotenv_raiz
MODE="$(bnb_leer_modo_postgres)"
if [[ "$MODE" != "portable" ]]; then
  echo "initdb solo aplica en modo portable. Modo actual: $MODE" >&2
  exit 1
fi

PG_BIN="$(bnb_resolver_pg_bin "$MODE")"
INITDB="$(bnb_pg_exe "$PG_BIN" initdb)"
PGDATA="${PGDATA:-}"
if [[ -z "$PGDATA" && -f "${SCRIPT_DIR}/postgres.local.config.json" ]]; then
  PGDATA="$(node -e "const j=require(process.argv[1]); console.log(j.pgData||'')" "${SCRIPT_DIR}/postgres.local.config.json")"
fi
[[ -n "$PGDATA" ]] || { echo "Defina PGDATA." >&2; exit 1; }

SUPERUSER="${PGSUPERUSER:-postgres}"
SUPER_PASS="${POSTGRES_SUPERUSER_PASSWORD:-${PGPASSWORD:-}}"
[[ -n "$SUPER_PASS" ]] || { echo "Defina POSTGRES_SUPERUSER_PASSWORD en .env." >&2; exit 1; }

mkdir -p "$PGDATA"
if compgen -G "${PGDATA}/*" >/dev/null; then
  echo "PGDATA no está vacío: $PGDATA" >&2
  exit 1
fi

PWFILE="$(mktemp)"
trap 'rm -f "$PWFILE"' EXIT
printf '%s' "$SUPER_PASS" >"$PWFILE"

echo "→ initdb en $PGDATA ..."
"$INITDB" -D "$PGDATA" -U "$SUPERUSER" --pwfile="$PWFILE" --auth-host=scram-sha-256 --auth-local=scram-sha-256 -E UTF8 --locale=C

echo "[OK] Clúster inicializado. Siguiente: ./start.sh y ./create-db.sh"