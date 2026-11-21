#!/usr/bin/env bash
# Utilidades compartidas PostgreSQL (modo portable o servicio Windows) — Git Bash.
set -euo pipefail

bnb_postgres_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bnb_repo_root="$(cd "${bnb_postgres_script_dir}/../.." && pwd)"

# shellcheck source=../lib/cargar-env.sh
source "${bnb_postgres_script_dir}/../lib/cargar-env.sh"

bnb_cargar_dotenv_raiz() {
  bnb_cargar_dotenv_monorepo "$bnb_repo_root"
}

bnb_win_path() {
  local p="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$p"
  else
    printf '%s' "$p"
  fi
}

bnb_leer_modo_postgres() {
  local mode="${PG_MODE:-}"
  local cfg="${bnb_postgres_script_dir}/postgres.local.config.json"
  if [[ -z "$mode" && -f "$cfg" ]]; then
    mode="$(node -e "const j=require(process.argv[1]); console.log((j.mode||'portable').toLowerCase())" "$cfg" 2>/dev/null || echo portable)"
  fi
  mode="${mode:-portable}"
  mode="$(echo "$mode" | tr '[:upper:]' '[:lower:]')"
  if [[ "$mode" != "portable" && "$mode" != "service" ]]; then
    echo "Modo PG inválido: $mode (use portable o service)." >&2
    exit 1
  fi
  printf '%s' "$mode"
}

bnb_resolver_pg_bin() {
  local mode="$1"
  local bin="${PG_BIN:-}"
  if [[ -z "$bin" && -f "${bnb_postgres_script_dir}/postgres.local.config.json" ]]; then
    bin="$(node -e "const j=require(process.argv[1]); console.log(j.pgBin||'')" "${bnb_postgres_script_dir}/postgres.local.config.json")"
  fi
  if [[ -n "$bin" && -x "${bin}/psql" || -f "${bin}/psql.exe" ]]; then
    printf '%s' "$bin"
    return
  fi
  if [[ "$mode" == "service" ]]; then
  for c in "${ProgramFiles}/PostgreSQL/16/bin" "${ProgramFiles}/PostgreSQL/15/bin"; do
      if [[ -f "$c/psql.exe" ]]; then printf '%s' "$c"; return; fi
    done
    echo "Modo service: defina PG_BIN o instale PostgreSQL." >&2
    exit 1
  fi
  echo "Defina PG_BIN (carpeta bin portable) o postgres.local.config.json." >&2
  exit 1
}

bnb_pg_exe() {
  local pg_bin="$1"
  local name="$2"
  if [[ -f "${pg_bin}/${name}.exe" ]]; then
    printf '%s' "${pg_bin}/${name}.exe"
  elif [[ -x "${pg_bin}/${name}" ]]; then
    printf '%s' "${pg_bin}/${name}"
  else
    echo "No se encontró ${name} en ${pg_bin}" >&2
    exit 1
  fi
}