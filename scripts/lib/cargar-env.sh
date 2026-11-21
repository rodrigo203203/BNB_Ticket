#!/usr/bin/env bash
# Carga segura de archivos .env (sin source/eval). Precedencia: raíz → apps/api/.env (gana el último).
# Uso: source este archivo y llamar bnb_cargar_dotenv_monorepo "$REPO_ROOT"

# Quita comillas envolventes simples o dobles (una capa).
_bnb_quitar_comillas_valor() {
  local v="$1"
  if [[ ${#v} -ge 2 ]]; then
    if [[ "$v" == \"*\" && "$v" == *\" ]]; then
      v="${v:1:${#v}-2}"
    elif [[ "$v" == \'*\' && "$v" == *\' ]]; then
      v="${v:1:${#v}-2}"
    fi
  fi
  printf '%s' "$v"
}

# Valida nombre de variable (identificador POSIX).
_bnb_clave_env_valida() {
  [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]
}

# Asigna una variable al entorno sin interpretar el valor.
_bnb_exportar_par() {
  local clave="$1"
  local valor="$2"
  if ! _bnb_clave_env_valida "$clave"; then
    echo "bnb_cargar_env: clave inválida omitida: ${clave}" >&2
    return 0
  fi
  # Sin eval: comillas alrededor de clave=valor para soportar espacios en el valor.
  export "${clave}=${valor}"
}

# Lee un archivo .env línea a línea. override=true pisa variables ya definidas.
bnb_cargar_dotenv_archivo() {
  local archivo="$1"
  local override="${2:-true}"
  [[ -f "$archivo" ]] || return 0

  local linea clave valor resto
  while IFS= read -r linea || [[ -n "$linea" ]]; do
    linea="${linea//$'\r'/}"
    linea="${linea#"${linea%%[![:space:]]*}"}"
    linea="${linea%"${linea##*[![:space:]]}"}"
    [[ -z "$linea" || "$linea" == \#* ]] && continue

    if [[ "$linea" == export[[:space:]]* ]]; then
      linea="${linea#export}"
      linea="${linea#"${linea%%[![:space:]]*}"}"
    fi

    [[ "$linea" == *"="* ]] || continue
    clave="${linea%%=*}"
    resto="${linea#*=}"
    clave="${clave%"${clave##*[![:space:]]}"}"
    clave="${clave#"${clave%%[![:space:]]*}"}"
    valor="$( _bnb_quitar_comillas_valor "$resto" )"

    if [[ "$override" != "true" && -n "${!clave-}" ]]; then
      continue
    fi
    _bnb_exportar_par "$clave" "$valor"
  done <"$archivo"
}

# Misma precedencia que apps/api/src/config/cargar-entorno.ts (override entre archivos).
bnb_cargar_dotenv_monorepo() {
  local raiz="${1:?Ruta raíz del monorepo}"
  bnb_cargar_dotenv_archivo "${raiz}/.env" true
  if [[ -f "${raiz}/apps/api/.env" ]]; then
    bnb_cargar_dotenv_archivo "${raiz}/apps/api/.env" true
  fi
}