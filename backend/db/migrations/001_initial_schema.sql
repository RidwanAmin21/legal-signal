-- ============================================================
-- LegalSignal Schema v1.0
-- Run this in the Supabase SQL Editor in one transaction
-- ============================================================

-- 1. clients
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name       TEXT NOT NULL,
    primary_domain  TEXT,
    domain_aliases  TEXT[] DEFAULT '{}',
    attorneys       TEXT[] DEFAULT '{}',
    practice_areas  TEXT[] DEFAULT '{}',
    market_key      TEXT NOT NULL,
    geo_config      JSONB DEFAULT '{}',
    contact_email   TEXT NOT NULL,
    tier            TEXT DEFAULT 'solo' CHECK (tier IN ('solo', 'growth', 'agency')),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. prompts
CREATE TABLE IF NOT EXISTS prompts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text            TEXT NOT NULL,
    practice_area   TEXT NOT NULL,
    metro           TEXT NOT NULL,
    intent_type     TEXT NOT NULL CHECK (intent_type IN ('recommendation', 'comparison', 'informational')),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. monitoring_runs
CREATE TABLE IF NOT EXISTS monitoring_runs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status                  TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'delivered')),
    started_at              TIMESTAMPTZ DEFAULT now(),
    completed_at            TIMESTAMPTZ,
    prompts_sent            INTEGER DEFAULT 0,
    responses_received      INTEGER DEFAULT 0,
    mentions_extracted      INTEGER DEFAULT 0,
    review_items_created    INTEGER DEFAULT 0,
    error_log               JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT now()
);

-- 4. monitoring_responses
CREATE TABLE IF NOT EXISTS monitoring_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID NOT NULL REFERENCES monitoring_runs(id) ON DELETE CASCADE,
    client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    prompt_id           UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL CHECK (platform IN ('perplexity', 'chatgpt', 'gemini')),
    raw_text            TEXT,
    citations           JSONB DEFAULT '[]',
    firms_mentioned     JSONB DEFAULT '[]',
    response_latency_ms INTEGER,
    created_at          TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT unique_response_per_run UNIQUE (run_id, prompt_id, platform)
);

-- 5. firm_registry
CREATE TABLE IF NOT EXISTS firm_registry (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market            TEXT NOT NULL,
    canonical_name    TEXT NOT NULL,
    aliases           TEXT[] DEFAULT '{}',
    domain            TEXT,
    attorneys         TEXT[] DEFAULT '{}',
    normalized_name   TEXT,
    is_active         BOOLEAN DEFAULT true,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- 6. visibility_scores
CREATE TABLE IF NOT EXISTS visibility_scores (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    run_id                  UUID NOT NULL REFERENCES monitoring_runs(id) ON DELETE CASCADE,
    week_date               DATE NOT NULL,
    overall_score           INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    mention_rate            DECIMAL(5,4),
    first_position_rate     DECIMAL(5,4),
    positive_sentiment_rate DECIMAL(5,4),
    chatgpt_score           INTEGER,
    perplexity_score        INTEGER,
    gemini_score            INTEGER,
    competitor_scores       JSONB DEFAULT '{}',
    score_components        JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_responses_client_created ON monitoring_responses(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registry_market_active ON firm_registry(market, is_active);
CREATE INDEX IF NOT EXISTS idx_registry_domain ON firm_registry(domain);
CREATE INDEX IF NOT EXISTS idx_scores_client_week ON visibility_scores(client_id, week_date DESC);
CREATE INDEX IF NOT EXISTS idx_runs_client_status ON monitoring_runs(client_id, status);
