# PROJECT_PLAN.md — LegalSignal Roadmap & Setup Guide

> Last updated: 2026-03-23

---

## 1. Project Status Overview

| Component | Status | Detail |
|-----------|--------|--------|
| Backend pipeline | **Working** | First successful run on 2026-03-23. Score: 37/100 for demo client. |
| Frontend UI | ~80% | All 10+ pages built and styled. Dark theme with gold accents. |
| Database schema | **Deployed** | 5 migrations applied (001-005). All tables populated. |
| API routes | 3 of ~7 built | `/api/scores`, `/api/competitors`, `/api/admin/review/resolve` |
| Auth | Scaffolded | Middleware + login page built. Supabase project connected. |
| External services | **Mostly configured** | OpenAI + Perplexity working. Gemini needs billing. Resend not yet set up. |
| Data integration | ~10% | Only `ReviewQueue` component calls real API. All other pages use hardcoded mock data. |

### Completed Setup (2026-03-23)
- Supabase project created, 5 migrations applied, demo data seeded
- OpenAI (GPT-4o + GPT-4o-mini) — working
- Perplexity (sonar-pro) — working
- First pipeline run completed: 24 responses, 129 mentions, score of 37/100
- See `FIRST_RUN_RESULTS.md` for full analysis

### What Needs to Be Done Next
1. **Create a test user** in Supabase Auth for frontend login (Phase 4.3 below)
2. **Fix Gemini** — enable billing in Google Cloud (free tier quota is 0)
3. **Wire frontend pages to real data** — replace mock data with API calls (Phase 5)
4. **Build missing API routes** — audits, settings, client profile (Phase 6)
5. **Review queue** — 71 items need human review in admin dashboard

---

## 2. Phase 1 — Account Setup & API Keys (COMPLETED 2026-03-23)

**All keys configured except Resend (optional) and Gemini needs billing enabled.**

### 2.1 Supabase (Required)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose region (US East recommended)
3. Set a strong database password and save it
4. Once created, go to **Project Settings → API** and copy:

| Value | Used As | Where |
|-------|---------|-------|
| Project URL | `SUPABASE_URL` | `backend/.env` |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` AND `frontend/.env.local` |

> The service_role key bypasses Row-Level Security. Never expose it to the browser — it's only used server-side (backend pipeline + Next.js API routes).

### 2.2 OpenAI (Strongly Recommended)

Used for **two things**: GPT-4o as a monitoring provider (asking legal questions), and GPT-4o-mini for structured extraction of firm mentions from AI responses.

1. Go to [platform.openai.com](https://platform.openai.com) → **API Keys** → Create new key
2. Add billing under **Settings → Billing** (pay-as-you-go)
3. Expected cost: ~$2-5 per full pipeline run for one client (26 prompts)
4. Save as `OPENAI_API_KEY` in `backend/.env`

> If OpenAI key is missing, extraction falls back to regex (`extraction/regex_fallback.py`) with `sentiment="unknown"`. Monitoring skips the ChatGPT platform entirely.

### 2.3 Perplexity (Optional but Recommended)

Used as a monitoring provider (sonar-pro model).

1. Go to [docs.perplexity.ai](https://docs.perplexity.ai) → Get API access
2. Generate an API key, add credits
3. Save as `PERPLEXITY_API_KEY` in `backend/.env`

> If missing, pipeline runs without the Perplexity platform. Scores are computed from whichever platforms are available.

### 2.4 Google AI / Gemini (Needs Billing)

Used as a monitoring provider (gemini-2.0-flash model).

1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API Key**
2. **Free tier does NOT work** — quota is 0 for gemini-2.0-flash. You must enable billing in Google Cloud Console.
3. Save as `GOOGLE_API_KEY` in `backend/.env`

> First pipeline run (2026-03-23): All 12 Gemini requests failed with 429 RESOURCE_EXHAUSTED. Enable billing to fix.

### 2.5 Resend (Optional — for email delivery)

Used to email PDF reports to clients after pipeline runs.

1. Go to [resend.com](https://resend.com) → Sign up → **API Keys**
2. For production: verify a sending domain in Resend dashboard
3. Save as `RESEND_API_KEY` in `backend/.env`

> If missing, pipeline runs normally but skips email delivery. PDF is still generated.

---

## 3. Phase 2 — Environment Configuration (COMPLETED 2026-03-23)

**Both env files created and populated.**

### 3.1 Backend

Edit `backend/.env` (already exists as a template):

```env
# AI Platform API Keys (at least one required)
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_API_KEY=AIza...

# Supabase (required)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Email (optional)
RESEND_API_KEY=re_...
FROM_EMAIL=reports@legalsignal.com

# App
ENVIRONMENT=development
LOG_LEVEL=INFO
```

Reference: `backend/.env.example` has the full template.

### 3.2 Frontend

Create `frontend/.env.local` (this file does NOT exist yet):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> `NEXT_PUBLIC_` vars are exposed to the browser. The service role key is only used in `/api/` server routes.

---

## 4. Phase 3 — Database Setup (PARTIALLY COMPLETE)

**Migrations applied, data seeded. Still need: test user creation (4.3) and user_clients row (4.3 step 4).**

### 4.1 Run Migrations

Go to **Supabase Dashboard → SQL Editor** and run each file **in order**:

1. `backend/db/migrations/001_initial_schema.sql` — Creates 6 tables: clients, prompts, monitoring_runs, monitoring_responses, firm_registry, visibility_scores
2. `backend/db/migrations/002_rls.sql` — Row-Level Security policies + user_clients table
3. `backend/db/migrations/003_score_unique.sql` — Unique constraint on (client_id, week_date)
4. `backend/db/migrations/004_prompt_unique.sql` — Unique constraint on (text, metro)

Alternatively, run `cd backend && source .venv/bin/activate && python main.py migrate` to print the SQL, then paste into the SQL Editor.

> Known bug: `run_migrations()` only prints migration 001. Manually paste each file for now.

### 4.2 Seed Demo Data

```bash
cd backend
source .venv/bin/activate
python main.py seed-demo
```

This creates:
- **Client:** "Mullen & Mullen Law Firm" (Dallas, personal_injury)
- **Prompts:** ~26 legal search queries from `prompts/dallas.json`
- **Firm registry:** ~25+ Dallas PI firms from `db/seeds/dallas_pi.json`

### 4.3 Create a Test User

1. Go to **Supabase Dashboard → Authentication → Users → Add User**
2. Set email + password
3. After creating, edit the user's **Raw User Metadata** to add:
   ```json
   {
     "client_id": "<copy the UUID from the clients table>",
     "role": "admin",
     "full_name": "Test User",
     "firm_name": "Mullen & Mullen Law Firm"
   }
   ```
4. Insert a row into `user_clients`:
   ```sql
   INSERT INTO user_clients (user_id, client_id)
   VALUES ('<user UUID from auth.users>', '<client UUID from clients>');
   ```

### 4.4 Enable Auth Providers

In **Supabase Dashboard → Authentication → Providers**:
- **Email/Password** — should be enabled by default
- Google OAuth and Apple Sign-In — can wait until later

---

## 5. Phase 4 — Verify Backend Pipeline (COMPLETED 2026-03-23)

**Pipeline ran successfully. See `FIRST_RUN_RESULTS.md` for full results.**
**Note:** Use `--client example_client` (not `--client example`).

### 5.1 Health Check

```bash
cd backend
source .venv/bin/activate
python main.py health
```

Expected output: DB connected, API keys detected, active clients found.

### 5.2 Run Pipeline

```bash
python main.py run --client example_client
```

This queries all configured AI providers with the seeded prompts, extracts mentions, resolves firm names, computes scores, and stores results. Takes 2-5 minutes.

### 5.3 Verify Data

Check these tables in Supabase:

| Table | What to Look For |
|-------|-----------------|
| `monitoring_runs` | New row with `status = 'completed'` |
| `monitoring_responses` | Rows with `raw_text` (AI responses) and `firms_mentioned` (JSONB array) |
| `visibility_scores` | Row with `overall_score`, `mention_rate`, per-platform scores, `competitor_scores` JSONB |

### 5.4 Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 → sign in with the test user → you should reach the dashboard.

> Note: The dashboard will still show **mock data** at this point. Wiring pages to real data is Phase 5.

---

## 6. Phase 5 — Wire Frontend Pages to Real Data

**These are code changes. Each item is a discrete task.**

### 6.1 Dashboard (`frontend/src/app/dashboard/page.tsx`)

**Current state:** Hardcoded arrays: `METRICS`, `RECENT_QUERIES`, `COMPETITOR_DATA`, `CONTENT_QUEUE`, firm name is `const FIRM = "Mullen & Mullen"`.

**What to do:**
- Import `useScores(clientId)` and `useCompetitors(clientId)` hooks (already built in `frontend/src/hooks/`)
- Import `useClientId()` to get the logged-in user's client
- Replace `METRICS` with computed values from latest `visibility_scores` row
- Replace `COMPETITOR_DATA` with `competitor_scores` JSONB from the score
- Replace `RECENT_QUERIES` with data from `monitoring_responses` (may need a new API route)
- Replace `FIRM` with client name from auth metadata or a new `/api/client` endpoint
- Add loading skeletons while data fetches

### 6.2 Competitors (`frontend/src/app/competitors/page.tsx`)

**Current state:** Hardcoded `COMPETITORS` array.

**What to do:**
- Use `useCompetitors(clientId)` hook
- Map `competitor_scores` JSONB into the table/chart components
- Add loading + empty states

### 6.3 Audits (`frontend/src/app/audits/page.tsx`)

**Current state:** Hardcoded `AUDITS` array.

**What to do:**
- Need new API route: `GET /api/audits?client_id=X` (see Phase 6)
- Fetch `monitoring_runs` for the client, ordered by date
- Each row shows: date, overall score, change from previous, query count, mention count, status

### 6.4 Audit Detail (`frontend/src/app/audits/[id]/page.tsx`)

**Current state:** Hardcoded query results and citation sources.

**What to do:**
- Need new API route: `GET /api/audits/[id]` (see Phase 6)
- Fetch the specific `monitoring_run` + all its `monitoring_responses`
- Display per-query breakdown with firm mentions and sentiments

### 6.5 Settings (`frontend/src/app/settings/page.tsx`)

**Current state:** Form fields with no backend mutations.

**What to do:**
- Need new API route: `PUT /api/settings/profile` (see Phase 6)
- Wire save button to update client profile
- Load current values from client record on mount

### 6.6 Content Page (`frontend/src/app/content/page.tsx`)

**Current state:** Hardcoded content items. No backend support for content management.

**What to do:** This is a **future feature**. For now, show an empty state or "Coming Soon" message. The pipeline doesn't produce content recommendations yet.

---

## 7. Phase 6 — Missing API Routes to Build

### 7.1 `GET /api/audits`

**File:** `frontend/src/app/api/audits/route.ts` (create)

**Logic:**
- Auth check (same pattern as `/api/scores`)
- Query `monitoring_runs` WHERE `client_id = ?` ORDER BY `created_at DESC`
- For each run, count responses and compute summary stats
- Return array of run summaries

### 7.2 `GET /api/audits/[id]`

**File:** `frontend/src/app/api/audits/[id]/route.ts` (create)

**Logic:**
- Auth check
- Fetch single `monitoring_run` by ID
- Verify it belongs to the user's client
- Fetch all `monitoring_responses` for that run
- Return run metadata + full response array

### 7.3 `PUT /api/settings/profile`

**File:** `frontend/src/app/api/settings/profile/route.ts` (create)

**Logic:**
- Auth check
- Accept body: `{ firm_name?, contact_email?, practice_areas?, geo_config? }`
- Update `clients` table WHERE `id = user's client_id`
- Return updated client record

### 7.4 `GET /api/client`

**File:** `frontend/src/app/api/client/route.ts` (create)

**Logic:**
- Auth check
- Fetch `clients` row for the user's `client_id`
- Return client profile (firm_name, market_key, practice_areas, etc.)
- Used by dashboard to display firm name and context

---

## 8. Phase 7 — Known Bugs to Fix

### Bug 1: `run_migrations()` only shows migration 001
**File:** `backend/db/connection.py`
**Issue:** The function doesn't iterate all `.sql` files in `db/migrations/`. Only prints the first one.
**Fix:** Sort glob results and iterate all files.

### Bug 2: `seed_registry` uses INSERT, not UPSERT
**File:** `backend/db/connection.py`
**Issue:** Re-running `seed-registry` silently skips existing firms instead of updating them.
**Fix:** Use `.upsert()` with `on_conflict` on the unique key.

### Bug 3: Gemini retry returns None
**File:** `backend/providers/gemini.py`
**Issue:** When all 3 retries fail, the `retry_error_callback` returns `None` instead of raising. Pipeline crashes on `result["raw_text"]`.
**Fix:** Remove the `retry_error_callback` so tenacity raises the last exception, which the pipeline already handles.

---

## 9. Phase 8 — Production Readiness

### 9.1 Scheduled Pipeline Execution
The pipeline must run weekly. Options:
- **GitHub Actions cron** — add a workflow that SSHs or calls a deploy hook
- **Railway cron job** — if deploying backend to Railway
- **Simple cron on a server** — `0 6 * * 1 cd /app/backend && python main.py run --all`

### 9.2 PDF Report Dependencies
WeasyPrint requires system-level libraries:
```bash
# macOS
brew install cairo pango gdk-pixbuf libffi

# Linux (handled by nixpacks.toml in repo)
apt-get install libpango-1.0-0 libcairo2 libgdk-pixbuf2.0-0
```

### 9.3 Email Domain Verification
For production email delivery via Resend:
1. Add your sending domain in Resend dashboard
2. Add the DNS records (SPF, DKIM, DMARC) to your domain
3. Update `FROM_EMAIL` in `backend/.env` to use the verified domain

### 9.4 Error Tracking
- Set `SENTRY_DSN` in both backend `.env` and frontend `.env.local`
- Backend already has Sentry SDK integrated (`sentry-sdk` in requirements.txt)
- Frontend: add `@sentry/nextjs` package and configure

### 9.5 Frontend Polish
- Wire logout button in sidebar (call `supabase.auth.signOut()`)
- Add error boundaries to all pages
- Add loading skeletons to data-fetching pages
- Handle empty states (no runs yet, no scores yet)

---

## 10. Future Work (Not in Current Scope)

- Add more markets beyond Dallas PI (Houston, Austin, etc.)
- Add more AI providers (Claude, Bing Chat, etc.)
- Content recommendation engine (suggest blog topics to improve visibility)
- Multi-client admin dashboard for agency use
- Subscription/billing system (Stripe)
- Webhook notifications on score changes
- Historical trend analysis and predictions
- White-label PDF reports with client branding

---

## Quick Reference: Key File Paths

| Purpose | Path |
|---------|------|
| Backend entry point | `backend/main.py` |
| Pipeline orchestrator | `backend/pipeline.py` |
| Scoring formula & weights | `backend/config/constants.py` |
| DB connection + seeding | `backend/db/connection.py` |
| Migrations | `backend/db/migrations/001-005_*.sql` |
| First run results | `FIRST_RUN_RESULTS.md` |
| AI providers | `backend/providers/{perplexity,openai_monitor,gemini}.py` |
| Entity extraction | `backend/extraction/extractor.py` |
| Fuzzy matching | `backend/resolution/matcher.py` |
| PDF templates | `backend/reporting/templates/` |
| Frontend API routes | `frontend/src/app/api/{scores,competitors,admin}/` |
| Frontend hooks | `frontend/src/hooks/{useScores,useCompetitors,useClientId}.ts` |
| Supabase clients | `frontend/src/lib/{supabase-browser,supabase-server}.ts` |
| Auth middleware | `frontend/src/middleware.ts` |
| Design tokens | `.impeccable.md` |
| Backend env template | `backend/.env.example` |
| Client config | `backend/clients/example_client.json` |
