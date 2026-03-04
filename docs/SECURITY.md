# Security Model

## Security Controls

1. HTTP hardening via `helmet`
2. request throttling via `express-rate-limit`
3. strict Zod input validation
4. API key auth support for protected endpoints
5. CORS allowlist via `ALLOWED_ORIGIN`
6. secret scanning via `npm run security:check`

## Sensitive Data Policy

- never commit real API keys, tokens, passwords, or DSNs
- keep runtime secrets in environment variables
- use `.env.example` placeholders only

## Operator Checklist

- set strong `BUILDERBOT_API_KEY`
- restrict `ALLOWED_ORIGIN` in production
- run behind TLS/reverse proxy
- run `npm run security:check` before pushes
- rotate credentials periodically

## Security Positioning

Security posture is a first-class product feature for enterprise-grade deterministic planning APIs.
