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
- `POST /api/v1/research/fusion`: combined leaderboard
- `POST /api/v1/masterpiece/magic-run`: evidence-informed deterministic output

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
