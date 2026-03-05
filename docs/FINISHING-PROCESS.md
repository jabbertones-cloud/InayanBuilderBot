# Finishing Process v1

`POST /api/v1/masterpiece/finish/run`

This endpoint generates an implementation-ready finishing system for sellable repos.

## Output Sections

- `qualityArchitecture`
- `humanLikeE2EStandard`
- `uxUiImprovementLoop`
- `gapHotspots` (learned from rolling completion-gap reports)
- `repoCriticalFlowCoverage`
- `releaseGate`
- `bestOpenSourceExemplars`
- `evidence` (GitHub + Reddit + fusion)
- `decisionCitations`
- `executionBridge`
- `markdownPlan`

## What It Does

1. Discovers and benchmarks open-source exemplars for quality and testing patterns.
2. Fuses benchmark scores with GitHub issue/repo evidence and Reddit signals.
3. Builds a repo-by-repo critical-flow coverage matrix.
4. Produces executable owner-based tasks with acceptance criteria.
5. Returns deterministic plan proof (`planHash`) and timing proof (`timeToFirstWowMs`).
6. Injects live gap hotspots (top incomplete sections + issue codes) into exemplar prioritization.

## Default Focus Repo Flow Map

- `autopay_ui`: signup/login, payment request creation, Stripe checkout, webhook crediting, support ticket, admin auth
- `capture`: upload/proof generation, verification, sharing/export, billing
- `CaptureInbound`: intake, attribution, lead transitions, notifications
- `FoodTruckPass`: onboarding, menu/order/payment, merchant dashboard
- `veritap_2026`: verification journey, evidence traceability, report export
- `quantfusion`: signal generation, strategy run, risk controls, report output
- `InayanBuilderBot`: magic run, recompile diff, contract gap check, streaming chat
- `pingmyself`: core loop, notifications, settings, edge failures
- `Madirectory`: listing, search/filter, lead handoff, admin moderation

## Release Gate (Ship Criteria)

- API contracts pass
- Golden deterministic E2E pass
- Human-like E2E pass
- Visual diffs approved
- A11y threshold passes
- Performance budgets pass
- Security/audit checks pass
- No blocker UX friction in telemetry

## Notes

- The endpoint is auth-protected (`x-api-key` or `Authorization: Bearer`).
- Results are persisted in run history and SQLite index store when enabled.
- OSS exemplar discovery uses cache + deterministic sorting to keep reruns stable.
- Gap hotspot learning reads `repo-completion-gap-rolling.json` via `GAP_HOTSPOT_REPORT_PATH` (or default claw-architect report locations), with builtin fallback profile if unavailable.
