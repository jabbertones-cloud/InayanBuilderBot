# Onboarding Guide

Use this guide to configure local credentials for deterministic Magic Run, GitHub research, Reddit research, and MCP checks.

## 1. Configure GitHub Access

Create a GitHub token with read/search capability and set:
- `GITHUB_TOKEN`
- `GITHUB_PERSONAL_ACCESS_TOKEN` (optional alias)

## 2. Configure Postgres (Optional for MCP flows)

Set:
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

## 3. Run Guided Setup

```bash
npm run setup:onboard
```

Or use the dashboard onboarding panel at `/`.

## 4. Verify Environment

```bash
npm run mcp:health
```

Expected result:
- wrapper checks pass
- script syntax checks pass
- missing credentials are reported as actionable warnings

## Security Rules

- never commit `.env`
- never paste secrets in issues/PRs
- rotate API keys regularly
