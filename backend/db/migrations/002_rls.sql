-- ============================================================
-- LegalSignal RLS Policies v1.0
-- Run this AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_registry          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_scores      ENABLE ROW LEVEL SECURITY;

-- ── Junction table: maps auth.users → clients ────────────────
-- This lets us look up which client(s) an authenticated user belongs to.
CREATE TABLE IF NOT EXISTS user_clients (
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, client_id)
);

ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

-- Users can read their own mappings
CREATE POLICY "user_clients: read own" ON user_clients
    FOR SELECT USING (user_id = auth.uid());

-- Only service role can insert/update (done during user provisioning)

-- ── clients ──────────────────────────────────────────────────
CREATE POLICY "clients: read own" ON clients
    FOR SELECT USING (
        id IN (
            SELECT client_id FROM user_clients WHERE user_id = auth.uid()
        )
    );

-- ── prompts ──────────────────────────────────────────────────
-- Prompts are shared reference data — any authenticated user can read
CREATE POLICY "prompts: read authenticated" ON prompts
    FOR SELECT USING (auth.role() = 'authenticated');

-- ── firm_registry ─────────────────────────────────────────────
-- Firm registry is shared reference data — any authenticated user can read
CREATE POLICY "firm_registry: read authenticated" ON firm_registry
    FOR SELECT USING (auth.role() = 'authenticated');

-- ── monitoring_runs ──────────────────────────────────────────
CREATE POLICY "monitoring_runs: read own" ON monitoring_runs
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_clients WHERE user_id = auth.uid()
        )
    );

-- ── monitoring_responses ─────────────────────────────────────
CREATE POLICY "monitoring_responses: read own" ON monitoring_responses
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_clients WHERE user_id = auth.uid()
        )
    );

-- ── visibility_scores ─────────────────────────────────────────
CREATE POLICY "visibility_scores: read own" ON visibility_scores
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_clients WHERE user_id = auth.uid()
        )
    );

-- ── Service role bypass ───────────────────────────────────────
-- The pipeline uses the service role key which bypasses RLS entirely.
-- No explicit INSERT/UPDATE policies are needed for the pipeline.
-- However, we must ensure the anon key cannot write to any table.
-- (INSERT/UPDATE/DELETE are denied by default when RLS is enabled and
--  no matching policy exists.)
