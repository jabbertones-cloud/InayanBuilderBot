# InayanBuilderBot

**InayanBuilderBot is the complete Masterpiece Agent + Chat Tool.**

Dedicated to **Suro Jason Inaya**. Built for him personally.

## Complete Product Scope

This is a robust, working system, not a lite demo. It includes:

1. Masterpiece pipeline orchestration endpoint
2. OSS repo scout with quality scoring
3. Benchmark/compare engine
4. Masterpiece blueprint generator
5. Chat tool with context-aware guidance
6. Persistent run artifacts and history
7. Security hardening + CI + secret checks

## Endpoints

- `POST /api/v1/masterpiece/pipeline/run` (full robust workflow)
- `POST /api/v1/scout/run`
- `POST /api/v1/benchmark/run`
- `POST /api/v1/masterpiece/build`
- `POST /api/v1/chat/reply`
- `GET /api/v1/chat/history`
- `GET /api/v1/runs`
- `GET /health`

## Robust Pipeline: What It Executes

`/api/v1/masterpiece/pipeline/run` performs:

1. Scout candidate repos from GitHub (or seed repos)
2. Exclude low-signal framework-only repos
3. Benchmark and compare top candidates
4. Optionally execute external OpenClaw indexing/scout stack:
   - `index:sync:agent`
   - `repo:readiness:pulse`
   - `dashboard:repo:scout`
5. Produce a final build blueprint based on selected top repos
6. Persist artifacts to `.data/runs.json`

## Install

```bash
git clone https://github.com/smanthey/InayanBuilderBot.git
cd InayanBuilderBot
npm install
cp .env.example .env
```

## Configure

Set in `.env`:

- `BUILDERBOT_API_KEY` (recommended for production)
- `ALLOWED_ORIGIN`
- `GITHUB_TOKEN` (recommended for GitHub API limit)
- `CLAW_ARCHITECT_ROOT` (optional, default `/Users/tatsheen/claw-architect`)

## Run

```bash
npm run dev
```

Open: `http://localhost:3000`

## Security

- Helmet headers
- Rate limiting
- Strict payload validation (Zod)
- Optional Bearer auth
- Secret scan (`npm run security:check`)
- CI checks on push/PR

## Validation Commands

```bash
npm run lint
npm run security:check
npm run test
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Installation](docs/INSTALLATION.md)
- [Gap Analysis](docs/GAP_ANALYSIS.md)
- [Security Best Practices Report](security_best_practices_report.md)
