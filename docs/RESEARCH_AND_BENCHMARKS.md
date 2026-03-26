# Research and Benchmarks

This guide describes how InayanBuilderBot uses research signals to improve deterministic planning output quality.

## Objective

Use external evidence to improve:
- repository selection quality
- implementation blueprint confidence
- execution task completeness

## Data Sources

- GitHub repository search and issue-answer mining
- Reddit signal collection via fallback chain
- curated benchmark index in `data/builtin-repo-index.json`

## Product Integration

- `POST /api/v1/github/research`: repo + issue/code-answer evidence
- `POST /api/v1/reddit/search`: ranked community signals
- `POST /api/v1/research/fusion`: combined leaderboard, optional deterministic selectors (`pipelineRunId`, `benchmarkRunId`, `githubRunId`, `redditRunId`, `githubQuery`, `redditQuery`)
- `POST /api/v1/masterpiece/magic-run`: evidence-informed deterministic output

## Deterministic Fusion Inputs

- Default behavior (`useLatestRuns=true`) uses the newest benchmark/github/reddit bundle.
- Deterministic behavior (`useLatestRuns=false`) allows explicit run-id or query-based selectors.
- Selection precedence: explicit run IDs -> query selectors -> latest bundle fallback.
- Fusion output now reports selected source metadata under `sources.selected`.

## Evidence Lineage

- Pipeline, magic-run, and finish-run now persist evidence with the effective research queries used at runtime.
- Fusion scoring now downweights GitHub-derived signals when GitHub `source_errors` are present.

## Benchmark Update Protocol

1. run GitHub and Reddit research for target product domain
2. update benchmark candidates in `data/builtin-repo-index.json`
3. run magic-run/pipeline and compare proof metrics
4. keep sources and citations attached to major decisions

## Evidence Rule

No citation, no claim.

## Example Search Themes

- deterministic AI builder agent
- execution-ready planning API
- MCP-integrated developer tooling
- benchmarked open-source agent frameworks
