#!/usr/bin/env bash
# Git Bash en Windows / bash en Linux
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/generar-secretos.mjs" "$@"