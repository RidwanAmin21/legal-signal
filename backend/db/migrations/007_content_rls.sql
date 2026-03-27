-- ============================================================
-- LegalSignal RLS Policies for Content Tables
-- Run this AFTER 006_content_tables.sql
-- ============================================================

-- Enable RLS on content tables
ALTER TABLE content_drafts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_alerts  ENABLE ROW LEVEL SECURITY;

-- ── content_drafts ─────────────────────────────────────────
CREATE POLICY "content_drafts: read own" ON content_drafts
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_clients WHERE user_id = auth.uid()
        )
    );

-- ── content_alerts ─────────────────────────────────────────
CREATE POLICY "content_alerts: read own" ON content_alerts
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_clients WHERE user_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE are denied by default when RLS is enabled
-- and no matching policy exists. The pipeline uses the service role
-- key which bypasses RLS entirely.
