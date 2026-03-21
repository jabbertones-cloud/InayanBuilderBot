-- EcoIntel API — Phase 1 Schema

-- Taxonomy Categories
CREATE TABLE IF NOT EXISTS taxonomy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  feature_keys TEXT[] DEFAULT ARRAY[]::TEXT[],
  weight_config JSONB DEFAULT '{"similarity": 0.4, "features": 0.4, "health": 0.2}'::JSONB,
  constraint_axes JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_categories_slug ON taxonomy_categories(slug);

-- Taxonomy Features
CREATE TABLE IF NOT EXISTS taxonomy_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES taxonomy_categories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT,
  description TEXT,
  detection_method TEXT CHECK (detection_method IN ('readme_keyword', 'dependency', 'config', 'code_pattern', 'manifest')) DEFAULT 'readme_keyword',
  rule_ref TEXT,
  peer_prevalence NUMERIC(4,3) CHECK (peer_prevalence >= 0 AND peer_prevalence <= 1) DEFAULT 0.5,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')) DEFAULT 'medium',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, key)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_features_category ON taxonomy_features(category_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_features_key ON taxonomy_features(key);

-- Repositories
CREATE TABLE IF NOT EXISTS repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE,
  full_name TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  primary_language TEXT,
  languages_json JSONB DEFAULT '{}'::JSONB,
  license TEXT,
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  open_issues INT DEFAULT 0,
  default_branch TEXT DEFAULT 'main',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  pushed_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE,
  category_id UUID REFERENCES taxonomy_categories(id),
  category_confidence NUMERIC(4,3) CHECK (category_confidence >= 0 AND category_confidence <= 1),
  feature_vector JSONB DEFAULT '{}'::JSONB,
  health_score NUMERIC(4,3) CHECK (health_score >= 0 AND health_score <= 1),
  health_signals JSONB DEFAULT '{"recency": 0, "velocity": 0, "adoption": 0, "risk_penalty": 0}'::JSONB,
  deps_json JSONB DEFAULT '{"npm": [], "pip": [], "go": [], "cargo": []}'::JSONB,
  embedding_id TEXT,
  integration_proxy JSONB DEFAULT '{"score": 0, "estimated_integration_hours": 0}'::JSONB,
  supply_chain JSONB DEFAULT '{}'::JSONB,
  last_indexed_at TIMESTAMPTZ,
  index_version INT DEFAULT 1,
  schema_version INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repos(full_name);
CREATE INDEX IF NOT EXISTS idx_repos_github_id ON repos(github_id);
CREATE INDEX IF NOT EXISTS idx_repos_category_id ON repos(category_id);
CREATE INDEX IF NOT EXISTS idx_repos_last_indexed_at ON repos(last_indexed_at);
CREATE INDEX IF NOT EXISTS idx_repos_health_score ON repos(health_score);

-- Similarity Cache
CREATE TABLE IF NOT EXISTS similarity_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  target_repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  similarity_total NUMERIC(5,4) CHECK (similarity_total >= 0 AND similarity_total <= 1),
  similarity_breakdown JSONB DEFAULT '{"meta": 0, "readme": 0, "deps": 0, "features": 0, "health": 0}'::JSONB,
  category_id UUID REFERENCES taxonomy_categories(id),
  weight_version TEXT DEFAULT 'v1',
  computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
  UNIQUE(source_repo_id, target_repo_id, weight_version)
);

CREATE INDEX IF NOT EXISTS idx_similarity_cache_source ON similarity_cache(source_repo_id);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_target ON similarity_cache(target_repo_id);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_expires ON similarity_cache(expires_at);

-- Contrast Cache
CREATE TABLE IF NOT EXISTS contrast_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  peer_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  dep_adds TEXT[] DEFAULT ARRAY[]::TEXT[],
  dep_removes TEXT[] DEFAULT ARRAY[]::TEXT[],
  feature_xor JSONB DEFAULT '{}'::JSONB,
  pattern_refs JSONB DEFAULT '{}'::JSONB,
  computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, peer_id)
);

CREATE INDEX IF NOT EXISTS idx_contrast_cache_source ON contrast_cache(source_id);
CREATE INDEX IF NOT EXISTS idx_contrast_cache_peer ON contrast_cache(peer_id);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT UNIQUE NOT NULL,
  label TEXT,
  tier TEXT CHECK (tier IN ('free', 'developer', 'usage', 'enterprise')) DEFAULT 'free',
  owner_email TEXT,
  stripe_sub_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  quota_monthly INT DEFAULT 1000,
  quota_used INT DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 month'
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(revoked_at);

-- Usage Events
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT,
  repo_url TEXT,
  job_id UUID,
  tokens_used INT DEFAULT 0,
  latency_ms INT,
  cache_hit BOOLEAN DEFAULT FALSE,
  stripe_reported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_events_api_key ON usage_events(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_stripe ON usage_events(stripe_reported);

-- Ingest Jobs
CREATE TABLE IF NOT EXISTS ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('queued', 'processing', 'done', 'failed')) DEFAULT 'queued',
  priority INT DEFAULT 2,
  requested_by_key UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status ON ingest_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_repo_url ON ingest_jobs(repo_url);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_created ON ingest_jobs(created_at);

-- Version Evaluations
CREATE TABLE IF NOT EXISTS version_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_version TEXT NOT NULL,
  category_id UUID REFERENCES taxonomy_categories(id),
  recall_at_10 NUMERIC(4,3) CHECK (recall_at_10 >= 0 AND recall_at_10 <= 1),
  precision_at_5 NUMERIC(4,3) CHECK (precision_at_5 >= 0 AND precision_at_5 <= 1),
  feature_f1 NUMERIC(4,3) CHECK (feature_f1 >= 0 AND feature_f1 <= 1),
  passed BOOLEAN DEFAULT FALSE,
  run_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_version_evaluations_weight ON version_evaluations(weight_version);
CREATE INDEX IF NOT EXISTS idx_version_evaluations_category ON version_evaluations(category_id);

-- Seed: ai-agent-frameworks category
INSERT INTO taxonomy_categories (slug, name, description, version, weight_config)
VALUES (
  'ai-agent-frameworks',
  'AI Agent Frameworks',
  'Frameworks and libraries for building intelligent agent systems',
  1,
  '{"similarity": 0.4, "features": 0.4, "health": 0.2}'::JSONB
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: features for ai-agent-frameworks
INSERT INTO taxonomy_features (category_id, key, label, description, detection_method, peer_prevalence, severity)
SELECT
  tc.id,
  feature.key,
  feature.label,
  feature.description,
  feature.detection_method,
  feature.peer_prevalence,
  feature.severity
FROM taxonomy_categories tc,
  (VALUES
    ('llm_integration', 'LLM Integration', 'Core LLM API integration and model routing', 'dependency', 0.85, 'critical'),
    ('tool_calling', 'Tool/Function Calling', 'Support for calling external tools or functions', 'code_pattern', 0.78, 'high'),
    ('memory_system', 'Memory/Context Management', 'Built-in memory, session, or context management', 'code_pattern', 0.72, 'high'),
    ('streaming_support', 'Streaming/Real-time Output', 'Support for streaming responses from LLMs', 'code_pattern', 0.65, 'medium'),
    ('multi_agent', 'Multi-Agent Orchestration', 'Support for coordinating multiple agents', 'code_pattern', 0.58, 'medium'),
    ('knowledge_retrieval', 'Knowledge/RAG Support', 'Built-in RAG, knowledge base, or vector DB integration', 'dependency', 0.62, 'medium'),
    ('human_in_loop', 'Human-in-Loop Approval', 'Support for pausing and requesting human approval', 'code_pattern', 0.45, 'low'),
    ('monitoring_observability', 'Monitoring & Observability', 'Built-in logging, tracing, or monitoring', 'config', 0.55, 'medium')
  ) AS feature(key, label, description, detection_method, peer_prevalence, severity)
WHERE tc.slug = 'ai-agent-frameworks'
ON CONFLICT (category_id, key) DO NOTHING;
