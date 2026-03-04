# Gap Analysis

Date: 2026-03-04

## Current Strength

InayanBuilderBot already ships a strong baseline for deterministic AI planning:
- magic-run orchestration
- GitHub + Reddit research stages
- quality scoring and self-repair
- execution bridge generation
- tests, CI, and security checks

## Highest-Leverage Gaps

1. Research precision
- Improve filtering confidence to reduce noisy repo candidates.

2. Service modularity
- Split `src/index.js` into focused modules for lower regression risk.

3. Persistence scalability
- Add Postgres-first mode for collaborative/enterprise usage.

4. Reproducibility artifacts
- Persist benchmark manifests with exact inputs and scoring context.

5. API contract discoverability
- Publish OpenAPI for faster integration and AI retrieval.

## 30-Day Technical Plan

Week 1:
- implement stricter candidate confidence filters
- add benchmark manifest persistence

Week 2:
- modularize research/scoring/route layers
- add OpenAPI generation and validation

Week 3:
- introduce Postgres-backed persistence mode
- add provider circuit-breaker state reporting

Week 4:
- ship weekly benchmark artifact publishing
- expand contributor templates for benchmark and provider adapters

## Success Metrics

- lower off-target benchmark candidates
- faster contributor onboarding
- higher reproducibility of repeated magic-run outputs
- better external API adoption
