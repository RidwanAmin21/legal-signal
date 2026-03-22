# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Install
```bash
make install              # Install both backend (pip) and frontend (npm)
make install-backend      # cd backend && pip install -r requirements.txt
make install-frontend     # cd frontend && npm install
```

### Development
```bash
make dev                  # Start Next.js frontend dev server (localhost:3000)
```

### Testing
```bash
make test                 # Run both backend and frontend tests
make test-backend         # cd backend && pytest tests/ -v
make test-frontend        # cd frontend && npm test

# Run a single backend test file
cd backend && pytest tests/test_scoring.py -v

# Run a single test by name
cd backend && pytest tests/test_scoring.py::test_function_name -v
```

### Pipeline
```bash
make pipeline                          # Run for all active clients
make pipeline-client client=example   # Run for one client (uses clients/example_client.json)
make migrate                           # Print migration SQL to apply in Supabase SQL editor
```

### Backend CLI (detailed)
```bash
cd backend
python main.py run --client example   # Run pipeline for one client
python main.py run --all              # Run for all active clients
python main.py health                 # Check DB connection + API key status
python main.py seed-demo              # Create demo client, seed prompts + registry
python main.py seed-prompts --metro dallas
python main.py seed-registry --market dallas_pi
python main.py migrate                # Print migration SQL
```

### Frontend
```bash
cd frontend && npm run lint            # ESLint
```

---

## Architecture

### Overview
LegalSignal monitors how AI search engines (ChatGPT, Gemini, Perplexity) recommend law firms. A Python pipeline runs weekly, producing visibility scores and PDF reports emailed to clients. A Next.js dashboard lets clients view their scores and competitors.

### Pipeline Flow (backend/pipeline.py)
```
Prompts (DB) → AI APIs (3 providers) → Raw responses stored in monitoring_responses
  → GPT-4o-mini extraction (extraction/extractor.py) → Entity resolution (resolution/matcher.py)
  → Scoring (scoring/scorer.py) → visibility_scores table
  → PDF render (reporting/pdf_renderer.py via WeasyPrint) → Email (reporting/email_delivery.py via Resend)
```

The pipeline is a single synchronous Python process — **no Celery, Redis, or task queues**. Each step runs sequentially per client with 0.5s rate limiting between API calls.

### Scoring Formula (config/constants.py)
- **Overall score (0–100):** `mention_rate × 50 + first_position_rate × 30 + positive_sentiment_rate × 20`
- Score bands: Excellent ≥70, Good ≥40, Fair ≥15, Weak <15
- Entity resolution fuzzy thresholds: auto-accept ≥85, queue for review ≥65, discard <65

### Backend Modules
| Module | Purpose |
|--------|---------|
| `providers/` | AI API clients (Perplexity/sonar-pro, OpenAI/gpt-4o, Gemini/gemini-2.0-flash). Falls back gracefully if API key missing. |
| `extraction/extractor.py` | GPT-4o-mini structured extraction of firm mentions from raw AI responses. Falls back to `regex_fallback.py` if OpenAI unavailable. |
| `resolution/matcher.py` | Alias lookup + rapidfuzz fuzzy matching against `firm_registry` table. |
| `scoring/scorer.py` | Computes overall + per-platform visibility scores from resolved mentions. |
| `reporting/` | WeasyPrint PDF generation + Resend email delivery. Templates in `reporting/templates/`. |
| `db/connection.py` | Supabase client singleton + seeding functions. |
| `config/settings.py` | Pydantic settings loaded from `.env`. |
| `clients/` | Per-client JSON config files (e.g. `example_client.json`) — used for single-client runs. |

### Frontend (Next.js App Router)
- **Auth:** Supabase Auth with `@supabase/ssr`. `middleware.ts` protects routes. Users have `client_id` and `role` in `user_metadata`.
- **API routes** (`src/app/api/`): Server-side routes that verify Supabase session, then query DB with service role key. Auth check: user's `client_id` must match requested `client_id` (or role=admin).
- **Data fetching:** `@tanstack/react-query` in client components. Two Supabase clients: `supabase-browser.ts` (client) and `supabase-server.ts` (server/service role).
- **Key pages:** Dashboard (scores chart), Competitors, Admin Review (entity resolution queue).

### Database (Supabase/PostgreSQL)
Key tables: `clients`, `prompts`, `firm_registry`, `monitoring_runs`, `monitoring_responses`, `visibility_scores`.
- `monitoring_responses.firms_mentioned` — JSONB array of resolved mention objects
- `visibility_scores.competitor_scores` — JSONB `{firm_name: score}` map
- Idempotency: pipeline skips if a `completed`/`delivered` run already exists for a client today

### Environment Variables
**Backend** (`.env` in `backend/` or project root):
```
PERPLEXITY_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ENVIRONMENT=development
```

**Frontend** (`.env.local` in `frontend/`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Key Constraints

1. **No task queues.** The pipeline is single-process. If you need parallelism, use `asyncio` within a single run.
2. **Extraction uses GPT-4o-mini** (not the monitoring models). If `OPENAI_API_KEY` is unset, `regex_fallback.py` is used automatically.
3. **Per-client JSON configs** in `backend/clients/` are only used for `--client <name>` runs. For `--all`, clients come from the DB `clients` table.
4. **PDF generation requires WeasyPrint** which needs system-level dependencies (Cairo, Pango). On macOS: `brew install cairo pango`.
5. **Score weights and fuzzy thresholds** live in `backend/config/constants.py` — change there, not in individual files.
6. **Frontend API routes use two Supabase clients:** anon key to verify the user's session, service role key to actually query data (bypassing RLS).
