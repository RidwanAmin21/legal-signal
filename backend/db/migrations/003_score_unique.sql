-- ============================================================
-- LegalSignal Migration 003 — Unique score per client per week
-- Prevents duplicate visibility_scores rows when pipeline runs
-- more than once on the same day.
-- ============================================================

ALTER TABLE visibility_scores
  ADD CONSTRAINT unique_score_per_client_week UNIQUE (client_id, week_date);
