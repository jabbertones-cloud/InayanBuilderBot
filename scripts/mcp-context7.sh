#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export npm_config_cache="${npm_config_cache:-$ROOT_DIR/.npm-mcp-cache}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$npm_config_cache}"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ "${1:-}" == "--healthcheck" ]]; then
  echo "[mcp-context7] ok"
  exit 0
fi

exec npm exec --yes --package=@upstash/context7-mcp@3.1.0 -- context7-mcp
