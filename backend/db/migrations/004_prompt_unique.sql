-- ============================================================
-- LegalSignal Migration 004 — Unique prompt per metro
-- Prevents duplicate prompts when seed_prompts() is run twice.
-- ============================================================

-- Remove any existing duplicates first (keep the earliest inserted row)
DELETE FROM prompts a USING prompts b
WHERE a.ctid > b.ctid
  AND a.text = b.text
  AND a.metro = b.metro;

-- Add unique constraint
ALTER TABLE prompts
  ADD CONSTRAINT unique_prompt_per_metro UNIQUE (text, metro);
