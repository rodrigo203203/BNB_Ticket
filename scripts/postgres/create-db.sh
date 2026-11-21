#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=postgres-common.sh
source "${SCRIPT_DIR}/postgres-common.sh"

bnb_cargar_dotenv_raiz
MODE="$(bnb_leer_modo_postgres)"
PG_BIN="$(bnb_resolver_pg_bin "$MODE")"
PSQL="$(bnb_pg_exe "$PG_BIN" psql)"

PGPORT="${PGPORT:-5432}"
SUPERUSER="${PGSUPERUSER:-postgres}"
SUPER_PASS="${POSTGRES_SUPERUSER_PASSWORD:-}"
APP_PASS="${BNB_DB_PASSWORD:-}"
DB_USER="${BNB_DB_USER:-bnb_app}"
DB_NAME="${BNB_DB_NAME:-bnb_tickets}"

[[ -n "$SUPER_PASS" && -n "$APP_PASS" ]] || {
  echo "Defina POSTGRES_SUPERUSER_PASSWORD y BNB_DB_PASSWORD en .env." >&2
  exit 1
}

export PGPASSWORD="$SUPER_PASS"
SAFE_APP_PASS="${APP_PASS//\'/\'\'}"
ROLE_SQL="DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${SAFE_APP_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${SAFE_APP_PASS}';
  END IF;
END
\$\$;"

echo "→ Rol aplicación ${DB_USER}..."
"$PSQL" -h localhost -p "$PGPORT" -U "$SUPERUSER" -d postgres -v ON_ERROR_STOP=1 -c "$ROLE_SQL"

EXISTS="$("$PSQL" -h localhost -p "$PGPORT" -U "$SUPERUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | tr -d '[:space:]')"
if [[ "$EXISTS" != "1" ]]; then
  "$PSQL" -h localhost -p "$PGPORT" -U "$SUPERUSER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"
fi
"$PSQL" -h localhost -p "$PGPORT" -U "$SUPERUSER" -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE \"${DB_NAME}\" TO \"${DB_USER}\";"

unset PGPASSWORD
echo "[OK] Base lista. Ejemplo DATABASE_URL:"
echo "postgresql://${DB_USER}:<BNB_DB_PASSWORD>@localhost:${PGPORT}/${DB_NAME}?schema=public"