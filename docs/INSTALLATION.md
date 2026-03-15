# Installation

InayanBuilderBot is designed to be simple to install, cheap to run, and reliable in daily use.

## Requirements

- Node.js 20+
- npm 10+

## Fast Local Setup

```bash
git clone https://github.com/jamonwidit/InayanBuilderBot.git
cd InayanBuilderBot
npm ci
npm run setup:auto
npm run dev:auto
```

## Required Environment Variables

- `BUILDERBOT_API_KEY`
- `ALLOWED_ORIGIN`
- `EXTERNAL_INDEXING_MODE` (`builtin`, `auto`, `openclaw`)

## Optional Provider Keys

- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`

## Optional Reddit Research Settings

- `REDDIT_USER_AGENT`
- `REDDIT_DEFAULT_SUBREDDITS`
- `REDDIT_REQUEST_TIMEOUT_MS`

## Production Run

```bash
npm run start
```

## Docker Run

```bash
docker compose up -d --build
```

## Verification Checklist

```bash
npm run lint
npm run security:check
npm run mcp:health
npm test
```
