# Inayan Builder Bot — QA Framework

**Canonical QA orchestration for the builder pipeline lives here.** This repo runs research, benchmark, and gap closure; the QA stack ensures the bot and its integrations stay healthy before and after runs.

App-specific QA (e.g. MorningOps Desktop Electron, AI explorer, K6 load tests) remains in those apps (`morningops-desktop/qa`, etc.). This folder is for:

- **InayanBuilderBot itself**: lint, unit tests, E2E, security gates, Claw baseline/security gates.
- **Future**: Running the same layers against a **target repo** (when the builder bot is asked to “full test” a repo).

## Layers (this repo)

| Layer        | Command / check                          | Notes                    |
|-------------|-------------------------------------------|--------------------------|
| lint        | `npm run lint`                            | Node check + security-check |
| unit        | `npm run test`                            | `node --test`            |
| e2e         | `npm run test:e2e`                        | Playwright (web UI)      |
| security    | `npm run security:check`                  | Scripts safety           |
| claw:security | `npm run claw:security:gate`            | Claw security gate       |
| claw:baseline | `npm run claw:baseline:gate`            | Claw baseline gate       |

## Usage

From **InayanBuilderBot** root:

```bash
# Full QA run (all layers)
npm run qa

# Fast run (skip slow layers; same as full for this repo currently)
npm run qa:fast

# Single layer
npm run qa -- --layer e2e

# CI mode (non-zero exit on failure, JSON report)
npm run qa:ci
```

## Reports

- `qa/reports/super-qa-report-latest.json` — latest run
- `qa/reports/super-qa-report-<timestamp>.json` — per-run archive

## Indexing

claw-architect indexes `InayanBuilderBot` and `InayanBuilderBot/qa` so agents can discover and run this QA stack. MorningOps Desktop `qa/` is indexed separately for app-specific flows.
