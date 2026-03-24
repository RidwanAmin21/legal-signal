-- ============================================================
-- LegalSignal Migration 006 — Content engine tables
-- content_drafts: gap → brief → draft → compliance → publish → cite
-- content_alerts: fired when a published URL is first cited by Perplexity
-- ============================================================

CREATE TABLE IF NOT EXISTS content_drafts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         UUID        NOT NULL REFERENCES clients(id)          ON DELETE CASCADE,
    run_id            UUID        NOT NULL REFERENCES monitoring_runs(id)  ON DELETE CASCADE,
    gap_opportunity   JSONB       DEFAULT '{}',   -- detect_gaps() output
    brief             JSONB       DEFAULT '{}',   -- generate_brief() output
    html              TEXT,                       -- raw article HTML
    package_html      TEXT,                       -- assembled deliverable HTML
    word_count        INTEGER,
    firm_name_count   INTEGER,
    compliance_result JSONB       DEFAULT '{}',
    status            TEXT        DEFAULT 'draft'
                      CHECK (status IN ('draft', 'needs_review', 'delivered', 'published', 'cited')),
    published_url     TEXT,                       -- filled by client after publishing
    first_cited_at    TIMESTAMPTZ,               -- filled by citation_matcher
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_alerts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    draft_id    UUID        REFERENCES content_drafts(id)  ON DELETE SET NULL,
    alert_type  TEXT        NOT NULL,             -- 'first_citation' | 'compliance_flag'
    payload     JSONB       DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_drafts_client
    ON content_drafts(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_drafts_status
    ON content_drafts(client_id, status);

CREATE INDEX IF NOT EXISTS idx_content_drafts_published
    ON content_drafts(client_id, published_url)
    WHERE published_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_alerts_client
    ON content_alerts(client_id, created_at DESC);
