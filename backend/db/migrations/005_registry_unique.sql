-- ============================================================
-- LegalSignal Migration 005 — Unique firm per market
-- Allows seed_registry() to upsert on (market, canonical_name)
-- ============================================================

ALTER TABLE firm_registry
  ADD CONSTRAINT unique_registry_per_market UNIQUE (market, canonical_name);
