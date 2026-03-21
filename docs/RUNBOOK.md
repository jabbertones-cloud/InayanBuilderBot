# InayanBuilderBot — Runbook

Operational runbook for running, integrating, and improving InayanBuilderBot.

## Mission Control / claw-architect integration

InayanBuilderBot is the **builder product** in the Index + Inayan Builder Loop. It is used by:

- **claw-architect** (Mission Control): builder-gap-pulse, research agenda, and manual/API calls.
- **Index → Research → Benchmark → Update** loop: each time you index a repo, use InayanBuilderBot to research Reddit and GitHub, find similar repos, benchmark, and update the app.

### Contract for Mission Control

- **Reddit search:** `POST /api/v1/reddit/search` — query-driven Reddit research (subreddits, ranking).
- **GitHub research:** `POST /api/v1/github/research` — repo discovery, releases, signals.
- **Research fusion:** `POST /api/v1/research/fusion` — combine Reddit + GitHub into a single research output (magic-run input).
- **Magic run:** `POST /api/v1/masterpiece/magic-run` — Scout → Benchmark → Blueprint → Execution Task List.
- **Health:** `GET /health` — liveness for dashboards.

### Environment

- Copy `.env.example` to `.env` and set:
  - `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` (optional, for Reddit OAuth).
  - `GITHUB_TOKEN` (optional, for GitHub API).
  - `x-api-key` header for API calls (e.g. `local-dev-key` for local).
- See `.env.example` and [INSTALLATION.md](./INSTALLATION.md).

### How claw-architect calls InayanBuilderBot

- **Canonical operator lane:** `npm run inayan:full-cycle -- --until-repo InayanBuilderBot --max-iterations 1` from claw-architect. This is the entrypoint for indexing, gap analysis, benchmark lookup, research agenda, feature benchmark, queueing, and doc sync.
- **Reddit research:** `builder-gap-pulse` calls `POST /api/v1/reddit/search` when InayanBuilderBot is reachable and a repo still has research targets from the builder agenda.
- **GitHub research:** `builder-gap-pulse` calls `POST /api/v1/github/research` with agenda- and benchmark-derived queries when a repo still has gaps.
- **Builder gap pulse:** `npm run builder:gap:pulse -- --repos InayanBuilderBot` now does more than queue workers. It runs gap analysis support scripts, optional InayanBuilderBot research, writes research artifacts under claw-architect `reports/inayan-builder-loop/`, then queues `repo_autofix` and `opencode_controller`.

## Pipeline: Video → index → brief → research → benchmark → InayanBuilderBot

Repeatable pipeline used to drive InayanBuilderBot from tutorial videos and research:

1. **Video URLs** → Add to `claw-architect/data/youtube-urls.txt`.
2. **YouTube index** → `npm run youtube:index:auto` (in claw-architect); produces `reports/youtube-transcript-visual-index-latest.json`.
3. **Brief** → `npm run youtube:index:to-brief` (in claw-architect); produces `docs/INAYAN-BUILDER-VIDEO-SPEC.md`.
4. **Research** → `npm run builder:research:agenda -- --repo InayanBuilderBot` or let `builder-gap-pulse` invoke it automatically as part of `npm run inayan:full-cycle`.
5. **Benchmark** → `npm run repo:completion:gap -- --repo InayanBuilderBot`, `npm run repo:benchmark:lookup -- --repo InayanBuilderBot`, and `npm run oss:benchmark:by-features -- --repo InayanBuilderBot` (all in claw-architect, or implicitly through the canonical full cycle).
6. **Update** → Run the canonical loop until no gaps remain: `npm run inayan:full-cycle -- --until-repo InayanBuilderBot`. This drives the pulse, research, queueing, and doc sync automatically.

## Automated content creator (video → content)

To use InayanBuilderBot **and** claw-architect together as an **automated content creator** (videos → research → scripts/copy):

1. **One-command pipeline (in claw-architect):**  
   `npm run content-creator:pipeline`  
   This runs: YouTube index (transcript + metadata) → brief → Reddit search → builder research agenda. Outputs: `docs/INAYAN-BUILDER-VIDEO-SPEC.md`, Reddit and research agenda reports.

2. **Research APIs (this repo):**  
   Call `POST /api/v1/reddit/search`, `POST /api/v1/github/research`, and `POST /api/v1/research/fusion` for more research. Use `POST /api/v1/masterpiece/magic-run` for blueprints and execution tasks.

3. **Content generation (claw-architect):**  
   Use the brief and research to drive copy/script generation: submit a goal to Mission Control (`POST /api/goal`) or queue `aicreator` / `copy_lab_run` with a goal derived from the brief. See claw-architect `docs/CONTENT-CREATOR.md`.

## First run (this repo)

```bash
npm ci
npm run setup:auto
npm run setup:index:shared
npm run dev:auto
```

## Quality gates

- `npm run lint`
- `npm run security:check`
- `npm test`
- `npm run test:e2e`

## Troubleshooting

- **Reddit/GitHub 4xx:** Check env (REDDIT_*, GITHUB_TOKEN); use optional OAuth or tokens.
- **Health failing:** Ensure SQLite/DB and required env are set; see INSTALLATION.md.
- **Mission Control not reaching InayanBuilderBot:** Ensure InayanBuilderBot is running (e.g. port 3030) and CORS/network allow requests from Mission Control host.
