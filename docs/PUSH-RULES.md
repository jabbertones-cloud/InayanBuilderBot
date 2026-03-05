# Push Rules (Public Repo)

## Mandatory Rules

- Public release branch is `main`.
- Run `npm run public:safety:check` before every push.
- Do not push `.env`, local machine paths, personal emails, hostnames, or local-only runtime artifacts.

## InayanBuilderBot Integration Rule

If a change touches integration points with AICCreator/claw tooling:
- Update related docs in the same push.
- Verify endpoints still run (`/health`, key API routes).

## Pre-Push Checklist

1. `npm run public:safety:check`
2. `git branch --show-current`
3. `git status`
4. `git push origin main`
