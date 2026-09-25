#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export npm_config_cache="${npm_config_cache:-$ROOT_DIR/.npm-mcp-cache}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$npm_config_cache}"

if [[ "${1:-}" == "--healthcheck" ]]; then
  echo "[mcp-filesystem] ok"
  exit 0
fi

exec npm exec --yes --package=@modelcontextprotocol/server-filesystem@2026.1.14 -- mcp-server-filesystem "$ROOT_DIR"
