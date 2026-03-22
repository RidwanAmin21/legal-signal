# CLAUDE.md — LegalSignal Backend

> Read this before writing any backend code. This is the authoritative guide for the Python backend.

---

## Virtual Environment (REQUIRED)

**Always use a virtual environment.** The global Python environment may have conflicting packages (e.g. `pynecone`, old `sqlmodel`, old `fastapi`) that break installs. Never run `pip install` or any Python/pytest/main.py command outside the venv.

```bash
# First-time setup (run once)
cd backend
python3 -m venv .venv

# Activate before ANY backend work (every session)
source .venv/bin/activate   # macOS/Linux

# Install
pip install -r requirements.txt
```

**Claude: always prefix backend shell commands with `source .venv/bin/activate &&` or verify the venv is active before running pip, pytest, or python commands in this directory.**

---

## Quick Reference

```bash
# Activate venv first
source .venv/bin/activate

# Install
pip install -r requirements.txt

# Run tests (no API keys needed for unit tests)
pytest tests/ -v

# Run single test file
pytest tests/test_scoring.py -v

# Run pipeline
python main.py run --all                  # All active clients
python main.py run --client example       # Single client (uses clients/example.json)

# Health check
python main.py health

# Seed data
python main.py seed-demo                  # Demo client + prompts + registry
python main.py seed-prompts --metro dallas
python main.py seed-registry --market dallas_pi

# Migrations (prints SQL — paste into Supabase SQL Editor)
python main.py migrate
```

---

## Architecture

### Pipeline Flow (`pipeline.py`)

The entire backend is a single synchronous pipeline. No Celery, no Redis, no task queue.

```
For each client:
  1. Load prompts from DB (filtered by client's practice_areas)
  2. Load firm_registry for client's market
  3. For each prompt x platform:
     a. Query AI provider (providers/) → raw text
     b. Extract mentions (extraction/) → [{firm_name, position, sentiment}]
     c. Resolve names (resolution/) → canonical_name + confidence
     d. Store in monitoring_responses table
  4. Compute visibility score (scoring/) → 0-100
  5. Store in visibility_scores table
  6. Render PDF + send email (reporting/)
```

Rate limit: 0.5s between API calls. Full run for one client with 26 prompts x 3 platforms = ~2-5 minutes.

### Module Dependency Graph

```
main.py
  └─ pipeline.py (orchestrator)
       ├─ providers/{perplexity,openai_monitor,gemini}.py  ← Query AI APIs
       ├─ extraction/extractor.py                          ← GPT-4o-mini structured extraction
       │    └─ extraction/regex_fallback.py                ← Fallback when no OpenAI key
       ├─ resolution/matcher.py                            ← Fuzzy entity resolution
       │    └─ resolution/normalizer.py                    ← Strip suffixes, lowercase
       ├─ scoring/scorer.py                                ← Weighted score formula
       ├─ reporting/pdf_renderer.py                        ← WeasyPrint HTML→PDF
       │    └─ reporting/templates/weekly_report.html
       ├─ reporting/email_delivery.py                      ← Resend API
       │    └─ reporting/templates/weekly_digest.html
       ├─ db/connection.py                                 ← Supabase client singleton
       └─ config/settings.py                               ← Pydantic env config
```

No module should import from `pipeline.py`. Pipeline is the top-level orchestrator only.

---

## Scoring Formula

Defined in `config/constants.py`. Do not duplicate weights elsewhere.

```
overall_score = mention_rate x 50 + first_position_rate x 30 + positive_sentiment_rate x 20
```

- `mention_rate` = unique prompts that mention the firm / total prompts queried
- `first_position_rate` = deduplicated first-position mentions / total mentions
- `positive_sentiment_rate` = positive sentiments / known-sentiment mentions (unknown defaults to 0.5)
- Score bands: Excellent >= 70, Moderate >= 40, Weak >= 15, Invisible < 15

---

## Key Design Decisions

### Extraction: GPT-4o-mini, not the monitoring models
Extraction uses a separate GPT-4o-mini call with `response_format={"type": "json_object"}`. This is intentional — the monitoring models (gpt-4o, sonar-pro, gemini-2.0-flash) generate the raw responses, and a cheaper model extracts structure from them. If `OPENAI_API_KEY` is unset, `regex_fallback.py` handles extraction with `sentiment="unknown"`.

### Resolution: Two-tier matching
1. **Exact alias match** (normalized names) → confidence=1.0, no review needed
2. **Fuzzy match** (rapidfuzz `token_sort_ratio`) → >= 85 auto-accept, 65-84 flagged for review, < 65 unknown

Thresholds live in `config/constants.py` as `FUZZY_AUTO_ACCEPT` and `FUZZY_REVIEW`.

### Idempotency
Pipeline skips a client if a `completed` or `delivered` monitoring_run already exists for today. Stale `running` runs from today are deleted before starting a new one.

### Provider fallback
Pipeline only initializes providers that have API keys set. If only one key is configured, it runs with just that platform. If zero keys: raises an error.

---

## Conventions

### Code Style
- Type hints on all function signatures
- Docstrings on all public functions
- Imports: stdlib → third-party → local
- No `print()` in library code — use `logging.getLogger(__name__)`
- `main.py` is the only place that calls `print()` (CLI output)

### File Naming
- Modules: `snake_case.py`
- Classes: `PascalCase` (providers only — everything else is functions)
- Constants: `UPPER_SNAKE_CASE` in `config/constants.py`

### Error Handling
- Providers: tenacity retry (3 attempts, exponential backoff). Raise on final failure.
- Extraction: catch JSON errors, fall back to regex. Never crash the pipeline.
- Pipeline: wrap each client in try/except. Log failures, continue with other clients. Aggregate failures into `failed_clients` list with `logger.critical` at the end.
- Reporting: catch all exceptions in `_deliver_report`. A failed report should not prevent score storage.

### Database Access
- Always use `get_supabase()` — returns singleton client with service role key
- Service role key bypasses RLS. The pipeline is a trusted backend process.
- Upsert with `on_conflict` for idempotent writes (scores, responses, prompts)
- `seed_registry` uses insert + catch duplicates (not upsert) — this is a known inconsistency

### Testing
- Tests that need no external services: mock OpenAI, mock Resend, use in-memory data
- Tests that need Supabase: use `@skip_no_db` decorator (auto-skips when env vars missing)
- Tests that need API keys: use `pytest.mark.skipif` on the key check
- Test files mirror module names: `test_extraction.py`, `test_scoring.py`, etc.
- All tests must pass with `pytest tests/ -v` and zero env vars configured

---

## Critical Constraints

1. **WeasyPrint requires system deps.** On macOS: `brew install cairo pango gdk-pixbuf libffi`. On Linux (nixpacks.toml handles this): `libpango-1.0-0 libcairo2 libgdk-pixbuf2.0-0`.

2. **Scoring weights are not validated.** The 50/30/20 split is an estimate. Do not change weights without stakeholder sign-off. If you need to experiment, add a separate function — don't modify `compute_visibility_score`.

3. **`monitoring_responses.firms_mentioned` is JSONB.** It stores the full resolved mention objects (firm_name, position, sentiment, canonical_name, confidence, needs_review). This is the source of truth for scoring — the pipeline re-reads responses from DB after all prompts complete.

4. **Provider `prompt_id` is set by the pipeline, not the provider.** All providers return `prompt_id=""`. The pipeline sets `result["prompt_id"] = prompt["id"]` after the call returns. Do not set prompt_id inside provider classes.

5. **Template rendering uses Jinja2 with `autoescape=True`.** Firm names with `&`, `<`, `"` are automatically escaped. Do not add manual escaping or use `|safe` unless you've verified the content is trusted.

6. **The `from_email` must be verified in Resend.** Default is `reports@legalsignal.com`. Changing this requires DNS verification in the Resend dashboard.

---

## Common Mistakes to Avoid

1. **Don't add async without converting the whole pipeline.** `pipeline.py` is synchronous. Individual async functions will block the event loop or require `asyncio.run()` wrappers. If adding concurrency, use `concurrent.futures.ThreadPoolExecutor` for provider calls, not async/await.

2. **Don't create a new Supabase client per function call.** Always use `get_supabase()` which returns the singleton. Creating multiple clients wastes connections and may hit rate limits.

3. **Don't hardcode platform names.** Use `config.constants.PLATFORMS` or check what `_get_available_providers()` returns. Platform names must be consistent: `"perplexity"`, `"chatgpt"`, `"gemini"` (not `"openai"`, not `"google"`).

4. **Don't add new scoring dimensions without updating the frontend.** The frontend reads `overall_score`, `mention_rate`, `first_position_rate`, `positive_sentiment_rate`, and per-platform scores from `visibility_scores`. Adding a new field requires a migration + frontend update.

5. **Don't put business logic in providers.** Providers only query APIs and return `ProviderResult`. Extraction, resolution, and scoring happen in the pipeline. A provider should never import from `extraction/` or `scoring/`.

6. **Don't use `seed_registry` for updates.** It uses `insert` (not `upsert`), so re-running it only adds new firms. To update existing firms, use direct Supabase queries or add an upsert-based update function.

---

## Database Tables (quick reference)

| Table | Purpose | Key Columns |
|---|---|---|
| `clients` | Law firms being monitored | firm_name, market_key, contact_email, practice_areas, geo_config, is_active |
| `prompts` | AI queries to run | text, practice_area, metro, intent_type, is_active |
| `firm_registry` | Known firms for entity resolution | market, canonical_name, aliases[], normalized_name, is_active |
| `monitoring_runs` | Pipeline execution log | client_id, status (running/completed/delivered/error), timestamps |
| `monitoring_responses` | Raw AI responses + extracted mentions | run_id, prompt_id, platform, raw_text, firms_mentioned (JSONB) |
| `visibility_scores` | Weekly score snapshots | client_id, week_date, overall_score, rates, competitor_scores (JSONB) |
| `user_clients` | Auth mapping (RLS) | user_id → client_id |

Unique constraints: `(client_id, week_date)` on scores, `(run_id, prompt_id, platform)` on responses, `(text, metro)` on prompts.

---

## Adding a New Market

To expand beyond Dallas PI:

1. Create `prompts/<metro>.json` with market-specific prompts (copy dallas.json structure)
2. Create `db/seeds/<market>.json` with the firm registry (copy dallas_pi.json structure)
3. Run `python main.py seed-prompts --metro <metro>`
4. Run `python main.py seed-registry --market <market>`
5. Create client in DB with `market_key=<market>` and appropriate `geo_config`
6. Pipeline will automatically pick it up on next `--all` run

---

## Adding a New AI Provider

1. Create `providers/<name>.py` with a class extending `BaseProvider`
2. Implement `query(self, prompt_text, geo_config) -> ProviderResult`
3. Add retry decorator (tenacity, 3 attempts, exponential backoff)
4. Add the API key field to `config/settings.py`
5. Add the provider to `_get_available_providers()` in `pipeline.py`
6. Add the platform name to `config/constants.PLATFORMS`
7. Add a test in `tests/test_providers.py` (skip if no API key)

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes (for pipeline) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for pipeline) | Service role key (bypasses RLS) |
| `OPENAI_API_KEY` | Recommended | Used by ChatGPT provider + GPT-4o-mini extraction |
| `PERPLEXITY_API_KEY` | Optional | Used by Perplexity provider |
| `GOOGLE_API_KEY` | Optional | Used by Gemini provider |
| `RESEND_API_KEY` | Optional | Email delivery (skipped if unset) |
| `SENTRY_DSN` | Optional | Error tracking (skipped in development) |
| `ENVIRONMENT` | Optional | "development" (default) or "production" |
| `FROM_EMAIL` | Optional | Sender address (default: reports@legalsignal.com) |

At least one AI provider key must be set for the pipeline to run. OpenAI is the most important (powers both monitoring and extraction).

---

## Known Issues

1. **Gemini retry_error_callback returns None** — `providers/gemini.py:23`. When all 3 retries fail, `query()` returns `None` instead of raising. Pipeline then crashes on `result["raw_text"]`. Fix: remove `retry_error_callback` so tenacity raises the last exception.

2. **`run_migrations()` only shows migration 001** — `db/connection.py:35`. Should iterate all `.sql` files sorted by name.

3. **`seed_registry` doesn't update existing firms** — uses `insert` not `upsert`. Re-running it skips duplicates silently.

4. **No scheduled execution** — Railway runs pipeline on deploy only. Needs cron trigger for weekly runs.

