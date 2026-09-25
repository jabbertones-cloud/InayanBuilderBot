# MCP Servers and Verification

InayanBuilderBot includes MCP wrapper scripts and a single health command for predictable setup quality.

## Included Wrappers

- `scripts/mcp-inayan-builder-server.mjs`
- `scripts/mcp-trigger.sh`
- `scripts/mcp-postgres.sh`
- `scripts/mcp-filesystem.sh`
- `scripts/mcp-github.sh`
- `scripts/mcp-context7.sh`
- `scripts/mcp-health-check.js`

## Verified Behaviors

- InayanBuilderBot MCP exposes API endpoints as agent-callable tools.
- MCP wrappers use a repo-local npm cache (`.npm-mcp-cache`) and pinned package versions for repeatable local startup.
- Postgres password URI encoding prevents connection-string breakage.
- GitHub healthcheck returns actionable warnings when token is missing.
- health script validates wrapper health, stdio `initialize` + `tools/list`, and shell + Node script syntax before exit.

## Current Package Pins

- Filesystem: `@modelcontextprotocol/server-filesystem@2026.1.14`
- Context7: `@upstash/context7-mcp@3.1.0`
- Trigger.dev: `trigger.dev@4.4.6`
- GitHub: `@modelcontextprotocol/server-github@2025.4.8` (npm package is deprecated; official replacement is GitHub's Docker/local `github/github-mcp-server`)
- Postgres: `@modelcontextprotocol/server-postgres@0.6.2` (npm package is deprecated; keep until a compatible maintained Postgres MCP is selected and smoke-tested)

## InayanBuilderBot MCP Server

Run:

```bash
cd /Users/scottmanthey/claw-repos/InayanBuilderBot
npm run start:auto
```

Then in a separate shell:

```bash
INAYAN_BUILDER_API_URL=http://127.0.0.1:3000 \
npm run mcp:inayan-builder
```

The MCP server also reads `.env`, so `BUILDERBOT_API_KEY` from `npm run setup:auto` is used when not exported.

List tools without starting stdio loop:

```bash
npm run mcp:inayan-builder -- --list-tools
```

Run self-test without contacting the API:

```bash
npm run mcp:inayan-builder -- --self-test
```

Tools:

- `health`
- `magic_run`
- `recompile`
- `finish_run`
- `pipeline_run`
- `github_research`
- `reddit_search`
- `fusion_research`
- `video_bootstrap`
- `scout_run`
- `benchmark_run`
- `index_search`
- `index_stats`
- `gap_hotspots`
- `contract_gap`

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
