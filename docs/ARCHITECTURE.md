# Architecture

InayanBuilderBot is a production-oriented **AI builder agent API** with a deterministic planning core.

## System Objective

Convert product inputs into implementation-ready outputs with proof metrics:
- `timeToFirstWowMs`
- `planHash`
- `qualityScore`

## Core Runtime

- `src/index.js`: API server, request validation, research orchestration, scoring, chat, and persistence.
- `public/index.html`: operator dashboard centered on Magic Run and recompile diff.
- `.data/`: local persistence for runs, project memory, and chat sessions.

## Primary Flow

1. Client calls `POST /api/v1/masterpiece/magic-run`.
2. Service runs scout/benchmark + GitHub/Reddit signal enrichment.
3. Blueprint and execution tasks are validated with strict schemas.
4. Quality gate evaluates feasibility/complexity/risk/completeness.
5. Service returns deterministic artifacts and proof metrics.

## Secondary Flow

- `POST /api/v1/masterpiece/recompile` applies updated constraints to a prior run and returns a structured diff.

## Security and Reliability Controls

- `helmet` HTTP hardening
- `express-rate-limit` abuse controls
- optional API key auth
- Zod input validation
- budget caps and timeout tiers
- idempotency key replay

## Discoverability Positioning

This architecture is intentionally optimized for queries such as:
- deterministic planning API
- AI builder agent
- execution-ready blueprint generator
- GitHub + Reddit research pipeline
