# EcoIntel API — Phase 1

**Ecosystem Intelligence API** — Repo intelligence layer for agents and copilots. Find the best open-source solutions for your use case through intelligent similarity matching and feature analysis.

## Phase 1 Features

- **Repository Ingestion**: Fetch GitHub metadata, extract dependencies, parse features
- **Similarity Matching**: Meta similarity (language/license/activity) + readme embedding + dependency Jaccard
- **Ecosystem Benchmarking**: Find similar repos with constraints (language, license, health score, features)
- **Fast Search**: Qdrant vector search <100ms latency
- **API Key Management**: Tiered rate limiting (free/developer/usage/enterprise)
- **Usage Tracking**: Per-endpoint analytics and cost attribution

## Architecture

```
src/
├── api/
│   ├── server.js              # Express app, middleware, routes
│   └── routes/
│       ├── ingest.js          # POST /v1/ingest
│       ├── benchmark.js       # POST /v1/ecosystem/benchmark (main)
│       ├── similar.js         # POST /v1/similar (fast)
│       ├── jobs.js            # GET /v1/jobs/:id
│       ├── repos.js           # GET /v1/repos/:id, /peers
│       └── categories.js      # GET /v1/categories
├── lib/
│   ├── redis.js               # Redis client
│   ├── queues.js              # BullMQ queues
│   ├── qdrant.js              # Vector search
│   └── scoring.js             # Similarity & health scoring
└── db/
    ├── index.js               # PostgreSQL pool
    ├── migrate.js             # Schema setup
    └── schema.sql             # DDL + seed data
```

## Setup

### Prerequisites
- Node.js ≥20
- PostgreSQL 14+
- Redis 6+
- Qdrant 1.8+

### Installation

```bash
npm install
npm run db:migrate
```

### Environment

Copy `.env.example` to `.env` and configure:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost/ecointel
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333

# Optional
PORT=4052
NODE_ENV=development
```

### Start

```bash
# API server
npm start

# Workers (Phase 2)
npm run start:workers

# MCP server (Phase 2)
npm run start:mcp
```

Health check: `curl http://localhost:4052/health`

## API Endpoints

### Ingest a Repository

```bash
curl -X POST http://localhost:4052/v1/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"repo_url": "github.com/openai/gpt-3.5-turbo"}'
```

**Response (202 cold, 200 cached):**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "estimated_seconds": 45,
  "status_url": "/v1/jobs/{job_id}"
}
```

### Find Similar Repos (Main Endpoint)

```bash
curl -X POST http://localhost:4052/v1/ecosystem/benchmark \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "repo_url": "github.com/owner/my-agent-framework",
    "category_hint": "ai-agent-frameworks",
    "constraints": {
      "primary_language": "Python",
      "license": "MIT",
      "min_health_score": 0.6
    },
    "k": 10,
    "include_narrative": true
  }'
```

**Response (200):**
```json
{
  "target_repo": {
    "id": "uuid",
    "full_name": "owner/my-agent-framework",
    "url": "https://github.com/owner/my-agent-framework"
  },
  "category_id": "uuid",
  "target_feature_vector": {
    "llm_integration": true,
    "tool_calling": true
  },
  "standard_features": ["llm_integration", "tool_calling", "memory_system", "streaming_support"],
  "missing_vs_standard": ["streaming_support"],
  "peer_aggregate": {
    "count": 3,
    "avg_health_score": 0.78,
    "avg_similarity": 0.72,
    "median_stars": 1250
  },
  "constraints_applied": ["language:Python", "license:MIT", "min_health_score:0.6"],
  "peers": [
    {
      "repo_id": "uuid",
      "full_name": "owner/langgraph",
      "url": "https://github.com/owner/langgraph",
      "description": "...",
      "primary_language": "Python",
      "license": "MIT",
      "stars": 2150,
      "similarity_total": 0.89,
      "similarity_breakdown": {
        "meta": 0.8,
        "readme": 0.92,
        "deps": 0.85,
        "features": 0.88,
        "health": 0.82
      },
      "health_score": 0.82,
      "suggestion_score": 0.85
    }
  ],
  "suggested_best_peer_index": 0,
  "recommendation": {
    "action": "fork",
    "reasons": [
      "owner/langgraph is a good starting point",
      "Requires extending with 1 major feature"
    ]
  },
  "suggestion_formula": "suggestion_score = 0.4*similarity + 0.4*features + 0.2*health (Phase 1)",
  "meta": {
    "k_requested": 10,
    "k_returned": 3,
    "total_candidates": 45,
    "phase": 1,
    "similarity_components": ["meta", "readme_embedding", "deps_jaccard"]
  }
}
```

### Fast Search

```bash
curl -X POST http://localhost:4052/v1/similar \
  -H "X-API-Key: your-api-key" \
  -d '{"repo_url": "github.com/owner/repo", "k": 5}'
```

**Response (200):**
```json
{
  "target_repo": {
    "id": "uuid",
    "full_name": "owner/repo"
  },
  "similar": [
    {
      "repo_id": "uuid",
      "full_name": "similar/repo",
      "url": "https://github.com/similar/repo",
      "similarity_score": 0.87,
      "stars": 1200
    }
  ]
}
```

### Get Job Status

```bash
curl http://localhost:4052/v1/jobs/{job_id} \
  -H "X-API-Key: your-api-key"
```

### Get Repository

```bash
curl http://localhost:4052/v1/repos/{repo_id} \
  -H "X-API-Key: your-api-key"
```

### Get Repository Peers

```bash
curl "http://localhost:4052/v1/repos/{repo_id}/peers?k=10" \
  -H "X-API-Key: your-api-key"
```

### List Categories

```bash
curl "http://localhost:4052/v1/categories?include_features=true" \
  -H "X-API-Key: your-api-key"
```

### Get Category Features

```bash
curl http://localhost:4052/v1/categories/ai-agent-frameworks/features \
  -H "X-API-Key: your-api-key"
```

## Scoring (Phase 1)

### Similarity Breakdown
- **Meta**: Language + license + activity recency + archive status (Jaccard-based) → [0, 1]
- **Readme**: Qdrant cosine similarity of embeddings → [0, 1]
- **Deps**: Jaccard similarity on normalized dependency names → [0, 1]
- **Features**: Intersection of target's detected features vs category standard → [0, 1]
- **Health**: Recency + velocity + adoption - risk_penalty → [0, 1]

**Phase 1 total**: `(meta + readme + deps) / 3`

### Suggestion Score (Ranking)
```
suggestion_score = 0.4*similarity + 0.4*features + 0.2*health
```

Weights configurable per category in `weight_config`.

### Recommendation Logic
- Similarity **>0.75** → **ADOPT** (high confidence)
- Similarity **0.3–0.75** + missing features >4 → **FORK**
- Similarity **0.3–0.75** + missing features ≤4 → **FORK**
- Similarity **<0.3** → **BUILD** (start from scratch)

## Rate Limits

| Tier       | Requests/min | Monthly Quota |
|-----------|-------------|-------------|
| free      | 10          | 1,000       |
| developer | 60          | 100,000     |
| usage     | 300         | 1M+         |
| enterprise| unlimited   | custom      |

## Phase 2 Roadmap

- Full 5-component fusion (current + cross-language + API similarity)
- Worker-based async ingest with GitHub Actions parsing
- MCP server for seamless agent integration
- Long-term similarity forecasting (growth trend analysis)
- Evaluation framework (precision@5, recall@10, F1 on ground truth)
- Monthly category weight retraining

## Architecture Notes

### Database
- PostgreSQL: repos, similarity cache, api keys, usage events
- Idempotent schema with `IF NOT EXISTS`
- Row-level security ready for multi-tenant

### Redis
- Queues: ingest, parse, embed, score (BullMQ)
- Rate limiting: per-key per-minute buckets
- Session/cache state (future)

### Qdrant
- `repo_readme_chunks`: 512-dim cosine, for readme search
- `repo_feature_summary`: 512-dim cosine, for feature aggregates (Phase 2)

### Scoring (Pure Functions)
All scoring functions in `src/lib/scoring.js` are pure and stateless, enabling:
- Retraining without schema changes
- Offline evaluation
- Deterministic reproducibility

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong API key hashing (bcrypt rounds ≥10)
- [ ] Enable PostgreSQL SSL
- [ ] Configure monitoring/alerting on queue depth
- [ ] Set up daily backups (repos, similarity_cache)
- [ ] Rate limit at reverse proxy (Nginx/Cloudflare)
- [ ] Add request signing for webhook integrity
- [ ] Implement usage cost attribution (Stripe)

## Support

For questions or issues, open a GitHub issue in the parent repo.

---

**EcoIntel Phase 1** — Built with Node.js, PostgreSQL, Redis, Qdrant, and Express.
