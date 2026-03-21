# MCP Servers and Verification

InayanBuilderBot includes MCP wrapper scripts and a single health command for predictable setup quality.

## Included Wrappers

- `scripts/mcp-trigger.sh`
- `scripts/mcp-postgres.sh`
- `scripts/mcp-filesystem.sh`
- `scripts/mcp-github.sh`
- `scripts/mcp-context7.sh`
- `scripts/mcp-reddit.sh`
- `scripts/mcp-health-check.js`

## Verified Behaviors

- Postgres password URI encoding prevents connection-string breakage.
- GitHub healthcheck returns actionable warnings when token is missing.
- Reddit healthcheck verifies `uvx` is available (no auth needed).
- health script validates shell + Node script syntax before exit.

## Run MCP Health

```bash
npm run mcp:health
```

Exit behavior:
- zero exit code on pass
- non-zero exit code on verification failure

## Required Env Keys for Full Coverage

GitHub:
- `GITHUB_TOKEN`
- `GITHUB_PERSONAL_ACCESS_TOKEN`

Postgres:
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Reddit:
- No env keys required (uses public JSON endpoints via `uvx reddit-no-auth-mcp-server`)
- Requires `uvx` (install via `curl -LsSf https://astral.sh/uv/install.sh | sh`)
