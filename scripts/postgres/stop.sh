#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=postgres-common.sh
source "${SCRIPT_DIR}/postgres-common.sh"

bnb_cargar_dotenv_raiz
MODE="$(bnb_leer_modo_postgres)"

if [[ "$MODE" == "service" ]]; then
  SVC="${PG_SERVICE_NAME:-postgresql-x64-16}"
  net stop "$SVC" 2>/dev/null || echo "No se pudo detener $SVC (puede no estar en ejecución)."
  exit 0
fi

PG_BIN="$(bnb_resolver_pg_bin "$MODE")"
PGCTL="$(bnb_pg_exe "$PG_BIN" pg_ctl)"
PGDATA="${PGDATA:-}"
[[ -n "$PGDATA" ]] || { echo "Defina PGDATA." >&2; exit 1; }
"$PGCTL" -D "$PGDATA" stop -m fast
echo "[OK] PostgreSQL portable detenido."