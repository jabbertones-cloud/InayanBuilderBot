#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

# Reddit MCP server requires no authentication.
# Uses public JSON endpoints via the `redd` library.

if [[ "${1:-}" == "--healthcheck" ]]; then
  # Verify uvx is available (required to run the Python MCP server)
  if ! command -v uvx &>/dev/null; then
    echo "[mcp-reddit] error: uvx not found. Install uv: https://docs.astral.sh/uv/getting-started/installation/" >&2
    exit 1
  fi
  echo "[mcp-reddit] ok"
  exit 0
fi

exec uvx reddit-no-auth-mcp-server
