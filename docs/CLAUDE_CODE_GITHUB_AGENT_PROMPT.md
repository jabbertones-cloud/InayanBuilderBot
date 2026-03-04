# Claude Code Prompt Template

Use this prompt in a new repository to recreate an InayanBuilderBot-class product.

```text
You are my senior engineer. Build a production-ready deterministic AI builder agent in this repository.

Reference architecture:
https://github.com/smanthey/InayanBuilderBot

Core objective:
- Ship a one-click deterministic planning flow that turns product inputs into executable build outputs.

Required endpoints:
- POST /api/v1/masterpiece/magic-run
- POST /api/v1/masterpiece/recompile
- GET /api/v1/masterpiece/magic-run/demo
- POST /api/v1/masterpiece/pipeline/run
- POST /api/v1/scout/run
- POST /api/v1/benchmark/run
- GET /api/v1/github/capabilities
- POST /api/v1/github/research
- GET /api/v1/reddit/capabilities
- POST /api/v1/reddit/search
- POST /api/v1/chat/reply
- POST /api/v1/chat/reply/stream
- GET /api/v1/chat/providers
- GET /health

Output contract requirements:
- deterministic proof fields: timeToFirstWowMs, planHash, qualityScore
- executable blueprint sections: file plan, API contracts, DB migration plan, test plan, rollout/rollback
- execution tasks must include: owner, estimate, dependencies, acceptance criteria
- reject incomplete/invalid output schemas

Reliability and security:
- Express + Zod validation + helmet + rate limiting
- idempotency key support for magic run
- timeout tiering + budget cap controls
- CI with lint + tests + security checks
- Dockerfile + docker-compose

First-run commands:
npm ci
npm run setup:auto
npm run dev:auto

Work style:
- implement directly without plan-only responses
- optimize for reproducibility and operator trust
```
