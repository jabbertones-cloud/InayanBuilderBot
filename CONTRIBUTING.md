# Contributing to InayanBuilderBot

InayanBuilderBot is an open-source **AI builder agent** focused on one core outcome: deterministic, execution-ready build plans.

## Contribution Priorities

We prioritize contributions that improve:
- deterministic Magic Run output quality
- execution bridge completeness (owner, estimate, dependencies, acceptance criteria)
- GitHub + Reddit research signal quality
- reliability, security, and reproducibility

## Quick Start

```bash
npm ci
npm run setup:auto
npm run lint
npm run test
npm run security:check
```

## Development Workflow

1. Create a branch from `main`.
2. Keep each PR focused on one behavior change.
3. Add or update tests for the changed behavior.
4. Run validation locally:

```bash
npm run lint
npm run test
npm run security:check
```

5. Open a PR with clear before/after behavior.

## PR Quality Bar

- no secrets in commits
- deterministic output behavior preserved or intentionally changed
- request validation added for new API inputs
- failure modes handled explicitly
- docs updated for any endpoint/schema behavior changes

## Commit Prefixes

- `feat:` new behavior
- `fix:` bug fix
- `docs:` documentation or copy changes
- `chore:` maintenance
- `test:` test-only changes

## Security Reports

If you discover a security issue, open a minimal private report first and avoid posting exploit detail in public issues.
