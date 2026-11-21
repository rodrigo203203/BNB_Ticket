#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=postgres-common.sh
source "${SCRIPT_DIR}/postgres-common.sh"

bnb_cargar_dotenv_raiz
MODE="$(bnb_leer_modo_postgres)"

if [[ "$MODE" == "service" ]]; then
  SVC="${PG_SERVICE_NAME:-postgresql-x64-16}"
  if command -v sc.exe >/dev/null 2>&1; then
    sc.exe query "$SVC" | head -n 3 || true
    net start "$SVC" 2>/dev/null || echo "Servicio $SVC (verifique que esté instalado)."
  else
    echo "Inicie manualmente el servicio PostgreSQL ($SVC)." >&2
  fi
  exit 0
fi

PG_BIN="$(bnb_resolver_pg_bin "$MODE")"
PGCTL="$(bnb_pg_exe "$PG_BIN" pg_ctl)"
PGDATA="${PGDATA:-}"
[[ -n "$PGDATA" ]] || { echo "Defina PGDATA." >&2; exit 1; }

LOG="${PGDATA}/server.log"
echo "→ pg_ctl start (PGDATA=$PGDATA)..."
"$PGCTL" -D "$PGDATA" -l "$LOG" start -w
echo "[OK] PostgreSQL portable en ejecución."