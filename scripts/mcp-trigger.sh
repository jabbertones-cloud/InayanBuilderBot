#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ "${1:-}" == "--healthcheck" ]]; then
  if ! command -v npx >/dev/null 2>&1; then
    echo "[mcp-trigger] npx missing" >&2
    exit 1
  fi
  NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$ROOT_DIR/.npm-mcp-cache}" \
    npm_config_cache="${npm_config_cache:-$ROOT_DIR/.npm-mcp-cache}" \
    npm exec --yes --package=trigger.dev@4.4.6 -- trigger mcp --help >/dev/null
  echo "[mcp-trigger] ok (trigger.dev mcp available)"
  exit 0
fi

export npm_config_cache="${npm_config_cache:-$ROOT_DIR/.npm-mcp-cache}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$npm_config_cache}"
exec npm exec --yes --package=trigger.dev@4.4.6 -- trigger mcp
