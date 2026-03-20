# CLAUDE.md — LegalSignal Build Specification

> **This is the single source of truth for building LegalSignal.** Read this entire file before writing any code. Every section contains critical constraints, known failure modes, and validation requirements. Skipping sections will cause integration failures.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Environment & Configuration](#4-environment--configuration)
5. [Database Schema (Supabase/PostgreSQL)](#5-database-schema)
6. [Backend Modules](#6-backend-modules)
7. [Frontend (Next.js)](#7-frontend)
8. [API Layer — Backend ↔ Frontend](#8-api-layer)
9. [Pipeline Runner](#9-pipeline-runner)
10. [PDF Report Generation](#10-pdf-report-generation)
11. [Email Delivery](#11-email-delivery)
12. [Known Issues & Failure Modes](#12-known-issues--failure-modes)
13. [Validation & Testing Requirements](#13-validation--testing-requirements)
14. [End-to-End Integration Tests](#14-end-to-end-integration-tests)
15. [Deployment](#15-deployment)
16. [Build Order](#16-build-order)

---

## 1. Project Overview

**LegalSignal** is a vertical SaaS platform that monitors how AI search engines (ChatGPT, Gemini, Perplexity) recommend law firms. It produces weekly visibility scores, competitor comparisons, and PDF reports delivered via email to law firm managing partners.

**What we sell:** A weekly PDF report + dashboard showing a law firm's AI search visibility score (0–100), how they compare to competitors, and which AI platforms mention them.

**Target customer:** Small-to-mid-size U.S. law firms (3–20 attorneys) paying $199–$399/month.

**Core pipeline (runs weekly):**
```
Prompts → AI APIs → Raw Responses → GPT-4o-mini Extraction → Entity Resolution → Scoring → PDF Report → Email
```

**Critical constraint:** This is a pre-revenue MVP. Build the smallest working system. No over-engineering. No premature abstraction. Every feature must serve the pipeline above.

---

## 2. Architecture

### 2.1 Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend / Pipeline | Python | 3.11+ |
| Database | Supabase (PostgreSQL 15+) | Managed |
| Frontend | Next.js (App Router) | 14+ |
| Styling | Tailwind CSS | 3+ |
| Charts | Recharts | Latest |
| Data Fetching | @tanstack/react-query | 5+ |
| PDF Generation | WeasyPrint + Jinja2 | WeasyPrint 61+, Jinja2 3.1+ |
| Email | Resend | 0.8+ |
| Entity Matching | rapidfuzz | 3.6+ |
| Payments | Stripe (Phase 3 only) | — |
| Hosting (BE) | Railway | — |
| Hosting (FE) | Vercel | — |
| Error Tracking | Sentry | Free tier |

### 2.2 Data Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Prompt      │───▶│  AI APIs     │───▶│  monitoring_     │
│  Library     │    │  (3 platforms)│    │  responses       │
│  (prompts)   │    └──────────────┘    └────────┬────────┘
└─────────────┘                                  │
                                                 ▼
                                    ┌─────────────────────┐
                                    │  GPT-4o-mini         │
                                    │  Extraction          │
                                    │  (firms_mentioned)   │
                                    └────────┬────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │  Entity Resolution       │
                              │  (firm_registry lookup)  │
                              └────────┬─────────────────┘
                                       │
                                       ▼
                            ┌────────────────────────┐
                            │  Scoring Engine         │
                            │  (visibility_scores)    │
                            └────────┬───────────────┘
                                     │
                              ┌──────┴──────┐
                              ▼             ▼
                        ┌──────────┐  ┌──────────┐
                        │  PDF     │  │  Dashboard│
                        │  Report  │  │  (Next.js)│
                        └────┬─────┘  └──────────┘
                             │
                             ▼
                       ┌──────────┐
                       │  Email   │
                       │  (Resend)│
                       └──────────┘
```

### 2.3 No Message Queue

The pipeline runs as a single Python process triggered by a cron job. **Do NOT use Celery, Redis, RabbitMQ, or any task queue.** Use `asyncio` for parallel API calls within a single run if needed.

---

## 3. Project Structure

```
legalsignal/
├── backend/
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py              # ProviderResult TypedDict, BaseProvider class
│   │   ├── perplexity.py        # Sonar Pro API client
│   │   ├── openai_monitor.py    # GPT-4o monitoring client (NOT extraction)
│   │   └── gemini.py            # Gemini API client
│   ├── extraction/
│   │   ├── __init__.py
│   │   ├── extractor.py         # GPT-4o-mini structured extraction
│   │   └── regex_fallback.py    # Fallback extraction if API fails
│   ├── resolution/
│   │   ├── __init__.py
│   │   ├── normalizer.py        # Firm name normalization
│   │   └── matcher.py           # Alias lookup + fuzzy matching
│   ├── scoring/
│   │   ├── __init__.py
│   │   └── scorer.py            # Visibility score computation
│   ├── reporting/
│   │   ├── __init__.py
│   │   ├── pdf_renderer.py      # WeasyPrint HTML → PDF
│   │   ├── email_delivery.py    # Resend integration
│   │   └── templates/
│   │       ├── weekly_report.html    # Jinja2 PDF template
│   │       └── weekly_digest.html    # Jinja2 email template
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connection.py        # Supabase client singleton
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py          # Pydantic settings from .env
│   │   └── constants.py         # Score weights, thresholds, platform list
│   ├── clients/
│   │   └── example_client.json  # Per-client config files
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_providers.py
│   │   ├── test_extraction.py
│   │   ├── test_resolution.py
│   │   ├── test_scoring.py
│   │   ├── test_pipeline.py     # End-to-end pipeline test
│   │   └── fixtures/            # Recorded API responses (JSON)
│   ├── main.py                  # CLI entry point
│   ├── pipeline.py              # Pipeline orchestration (sequential)
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── competitors/
│   │   │   │   └── page.tsx
│   │   │   ├── admin/
│   │   │   │   └── review/
│   │   │   │       └── page.tsx
│   │   │   └── api/
│   │   │       ├── scores/route.ts
│   │   │       ├── competitors/route.ts
│   │   │       └── admin/
│   │   │           └── review/
│   │   │               └── resolve/route.ts
│   │   ├── components/
│   │   │   ├── ScoreCard.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── CompetitorTable.tsx
│   │   │   ├── PlatformBreakdown.tsx
│   │   │   ├── ReviewQueue.tsx
│   │   │   └── Nav.tsx
│   │   ├── lib/
│   │   │   ├── supabase-browser.ts   # Browser client
│   │   │   ├── supabase-server.ts    # Server client (service role)
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── hooks/
│   │       ├── useScores.ts
│   │       └── useCompetitors.ts
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── .gitignore
├── Makefile
├── CLAUDE.md                    # THIS FILE
└── README.md
```

### ⚠️ CRITICAL: File Naming Rules

- Backend: All Python files use `snake_case.py`
- Frontend: React components use `PascalCase.tsx`, pages use `page.tsx` (Next.js App Router convention)
- **NEVER create a file called `openai.py`** — it conflicts with the `openai` package import. Use `openai_monitor.py` instead.
- **NEVER create a file called `resend.py`** — it conflicts with the `resend` package import. Use `email_delivery.py` instead.

---

## 4. Environment & Configuration

### 4.1 .env.example

```env
# ── AI Platform API Keys ──
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx
GOOGLE_API_KEY=AIzaxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# ── Supabase ──
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxx

# ── Email ──
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=reports@legalsignal.com

# ── Sentry ──
SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx

# ── App ──
ENVIRONMENT=development
LOG_LEVEL=INFO

# ── Frontend (prefixed with NEXT_PUBLIC_ for client-side access) ──
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxx
```

### 4.2 Settings Module — `backend/config/settings.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API keys
    perplexity_api_key: str
    openai_api_key: str
    google_api_key: str
    anthropic_api_key: str = ""  # Optional — only needed for content engine (Phase 2)

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Email
    resend_api_key: str
    from_email: str = "reports@legalsignal.com"

    # App
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

### ⚠️ KNOWN ISSUE: Pydantic Settings v2 Import

`pydantic-settings` is a **separate package** from `pydantic` in v2. You MUST install both:
```
pip install pydantic>=2.0.0 pydantic-settings>=2.2.0
```

If you see `ImportError: cannot import name 'BaseSettings' from 'pydantic'`, you are importing from the wrong package. The correct import is `from pydantic_settings import BaseSettings`, NOT `from pydantic import BaseSettings`.

### 4.3 Constants — `backend/config/constants.py`

```python
# Score formula weights — store components separately, compute composite at display time
MENTION_WEIGHT = 50
POSITION_WEIGHT = 30
SENTIMENT_WEIGHT = 20

# Score bands
SCORE_BANDS = {
    "excellent": (70, 100),
    "moderate": (40, 69),
    "weak": (15, 39),
    "invisible": (0, 14),
}

# Entity resolution thresholds
FUZZY_AUTO_ACCEPT = 85    # rapidfuzz score >= 85 → auto-match
FUZZY_REVIEW = 65         # rapidfuzz score 65–84 → flag for review
# Below 65 → mark as unknown, flag for review

# Platforms
PLATFORMS = ["perplexity", "chatgpt", "gemini"]

# Extraction model
EXTRACTION_MODEL = "gpt-4o-mini"

# Monitoring models per platform
PROVIDER_MODELS = {
    "perplexity": "sonar-pro",
    "chatgpt": "gpt-4o",
    "gemini": "gemini-2.0-flash",
}
```

---

## 5. Database Schema

### ⚠️ CRITICAL: Supabase-Specific Rules

1. **Always use `gen_random_uuid()` for UUID defaults** — Supabase supports this natively. Do NOT use `uuid_generate_v4()` without enabling the `uuid-ossp` extension first.
2. **TIMESTAMPTZ not TIMESTAMP** — Always use `TIMESTAMPTZ` for all timestamp columns. Supabase operates in UTC.
3. **TEXT[] arrays** — Supabase/PostgreSQL supports native arrays. Use `TEXT[]` for aliases, attorneys, practice_areas. Do NOT use JSONB for simple string arrays.
4. **JSONB for complex objects** — Use JSONB for nested structures like geo_config, score_components, firms_mentioned, error_log.
5. **Foreign key ON DELETE CASCADE** — All child tables must cascade on parent deletion to prevent orphaned rows.

### 5.1 Migration: `backend/db/migrations/001_initial_schema.sql`

```sql
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

    -- Idempotency: prevent duplicate responses on re-runs
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

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_responses_client_created ON monitoring_responses(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registry_market_active ON firm_registry(market, is_active);
CREATE INDEX IF NOT EXISTS idx_registry_domain ON firm_registry(domain);
CREATE INDEX IF NOT EXISTS idx_scores_client_week ON visibility_scores(client_id, week_date DESC);
CREATE INDEX IF NOT EXISTS idx_runs_client_status ON monitoring_runs(client_id, status);
```

### ⚠️ KNOWN ISSUE: Unique Constraint Violations on Re-runs

The `CONSTRAINT unique_response_per_run UNIQUE (run_id, prompt_id, platform)` will throw a PostgreSQL error if you try to insert a duplicate. When inserting responses, **always use upsert logic**:

```python
# CORRECT: Use upsert via Supabase
supabase.table("monitoring_responses").upsert(
    data,
    on_conflict="run_id,prompt_id,platform"
).execute()

# WRONG: This will throw on re-runs
supabase.table("monitoring_responses").insert(data).execute()
```

### ⚠️ KNOWN ISSUE: DECIMAL(5,4) Range

`DECIMAL(5,4)` stores values from -9.9999 to 9.9999. Rates should be stored as decimals (0.0000 to 1.0000), NOT as percentages (0 to 100). If you store 0.85 (85%), it works. If you accidentally store 85.0, it will throw a `numeric field overflow` error.

---

## 6. Backend Modules

### 6.1 Provider Base — `backend/providers/base.py`

```python
from typing import TypedDict

class ProviderResult(TypedDict):
    provider: str           # "perplexity" | "chatgpt" | "gemini"
    prompt_id: str          # UUID of the prompt
    raw_text: str           # Full AI response text
    citations: list[dict]   # [{url: str, position: int}] — Perplexity only, [] for others
    latency_ms: int         # Response time in milliseconds
    model: str              # Actual model used (e.g., "sonar-pro")

class BaseProvider:
    name: str = "base"

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        raise NotImplementedError
```

### 6.2 Perplexity Provider — `backend/providers/perplexity.py`

```python
import requests
import time
from .base import BaseProvider, ProviderResult
from config.settings import settings

class PerplexityProvider(BaseProvider):
    name = "perplexity"

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        start = time.time()
        payload = {
            "model": "sonar-pro",
            "messages": [{"role": "user", "content": prompt_text}],
            "web_search_options": {
                "search_context_size": "high",
                "user_location": {
                    "latitude": geo_config.get("latitude", 32.7767),
                    "longitude": geo_config.get("longitude", -96.797),
                    "country": geo_config.get("country", "US"),
                },
            },
        }
        resp = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.perplexity_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=45,
        )
        latency = int((time.time() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()

        raw_text = data["choices"][0]["message"]["content"]
        citations = [
            {"url": url, "position": i}
            for i, url in enumerate(data.get("citations", []))
        ]

        return ProviderResult(
            provider=self.name,
            prompt_id="",  # Set by caller
            raw_text=raw_text,
            citations=citations,
            latency_ms=latency,
            model="sonar-pro",
        )
```

### ⚠️ KNOWN ISSUE: Perplexity API Response Structure

The Perplexity API returns citations as a **top-level array** in the response JSON, NOT inside the message object. The path is:
```
data["citations"]        ← CORRECT (list of URL strings)
data["choices"][0]["message"]["citations"]  ← WRONG (does not exist)
```

Also, `data.get("citations", [])` is essential because not all responses include citations. If you access `data["citations"]` directly, it will throw `KeyError` on responses without web results.

### 6.3 OpenAI Provider — `backend/providers/openai_monitor.py`

```python
import openai
import time
from .base import BaseProvider, ProviderResult
from config.settings import settings

class OpenAIProvider(BaseProvider):
    name = "chatgpt"

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        start = time.time()

        # Prepend location context since OpenAI has no geo parameter
        localized_prompt = f"I am located in {geo_config.get('city', 'Dallas')}, {geo_config.get('state', 'TX')}. {prompt_text}"

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": localized_prompt}],
            temperature=0,
            max_tokens=2000,
        )
        latency = int((time.time() - start) * 1000)

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=response.choices[0].message.content or "",
            citations=[],
            latency_ms=latency,
            model="gpt-4o",
        )
```

### ⚠️ KNOWN ISSUE: OpenAI `response.choices[0].message.content` Can Be None

When the model refuses to answer or hits a content filter, `content` is `None`, not an empty string. **Always use `or ""`** when accessing it. If you pass `None` to the extraction module, it will throw `TypeError` when you try string operations.

### 6.4 Gemini Provider — `backend/providers/gemini.py`

```python
import google.generativeai as genai
import time
from .base import BaseProvider, ProviderResult
from config.settings import settings

class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        localized_prompt = f"I am located in {geo_config.get('city', 'Dallas')}, {geo_config.get('state', 'TX')}. {prompt_text}"
        start = time.time()
        response = self.model.generate_content(localized_prompt)
        latency = int((time.time() - start) * 1000)

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=response.text if response.text else "",
            citations=[],
            latency_ms=latency,
            model="gemini-2.0-flash",
        )
```

### ⚠️ KNOWN ISSUE: Gemini Safety Blocks

Gemini frequently blocks responses it considers unsafe, including legal recommendation queries. When this happens:
- `response.text` raises `ValueError: Response has no text` instead of returning `None`
- You **must** wrap `response.text` access in a try/except

```python
try:
    raw_text = response.text or ""
except ValueError:
    # Gemini blocked the response — treat as empty
    raw_text = ""
```

Also check `response.prompt_feedback` — if `block_reason` is set, the response was filtered. Log these for debugging but do not treat them as pipeline failures.

### ⚠️ KNOWN ISSUE: Gemini `google-generativeai` SDK Model Names

The SDK uses different model name formats than the REST API:
- SDK: `"gemini-2.0-flash"` ← CORRECT
- REST API: `"models/gemini-2.0-flash"` ← Different format
- **WRONG:** `"gemini-pro"` ← This is an older model, do not use

If you get `404 models/xxx is not found`, check that you are using the correct model string for the SDK version installed.

### 6.5 Extraction — `backend/extraction/extractor.py`

```python
import json
import openai
from config.settings import settings

EXTRACTION_PROMPT = """You are a structured data extractor. Given an AI response about lawyers/law firms, extract every firm or attorney mentioned.

Return ONLY valid JSON — no markdown, no explanation. Return an array of objects:
[
  {
    "firm_name": "exact name as mentioned in the text",
    "position": 1,
    "sentiment": "positive" | "neutral" | "negative",
    "description": "brief summary of what was said about this firm (1 sentence max)"
  }
]

If no firms are mentioned, return an empty array: []

Known firms in this market (use these for reference, but also extract any OTHER firms mentioned):
{known_firms}

AI Response to extract from:
{response_text}"""


def extract_mentions(response_text: str, known_firms: list[str]) -> list[dict]:
    """Extract firm mentions from an AI response using GPT-4o-mini."""
    if not response_text or not response_text.strip():
        return []

    client = openai.OpenAI(api_key=settings.openai_api_key)

    try:
        result = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": EXTRACTION_PROMPT.format(
                    known_firms=", ".join(known_firms),
                    response_text=response_text,
                ),
            }],
            temperature=0,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = result.choices[0].message.content or "[]"
        parsed = json.loads(content)

        # Handle both {"firms": [...]} and [...] formats
        if isinstance(parsed, dict):
            parsed = parsed.get("firms", parsed.get("mentions", parsed.get("results", [])))
        if not isinstance(parsed, list):
            parsed = []

        return parsed

    except (json.JSONDecodeError, openai.APIError) as e:
        # Fall back to regex extraction
        from .regex_fallback import regex_extract
        return regex_extract(response_text, known_firms)
```

### ⚠️ KNOWN ISSUE: GPT-4o-mini JSON Response Format

When you use `response_format={"type": "json_object"}`, GPT-4o-mini:
1. **ALWAYS returns valid JSON** — but the top-level structure is unpredictable
2. Sometimes returns `{"firms": [...]}`, sometimes `{"mentions": [...]}`, sometimes just `[...]` wrapped in an object like `{"results": [...]}`
3. **NEVER returns a raw array** when `json_object` mode is on — it always wraps in an object

The extraction code above handles all these cases. **Do not assume a specific key name.** Always check multiple possible keys and fall back gracefully.

### ⚠️ KNOWN ISSUE: GPT-4o-mini Sometimes Returns Markdown Despite Instructions

Even with `response_format={"type": "json_object"}`, some edge cases produce responses with markdown code fences. Always strip them before parsing:

```python
content = content.strip()
if content.startswith("```"):
    content = content.split("\n", 1)[-1].rsplit("```", 1)[0]
```

### 6.6 Entity Resolution — `backend/resolution/matcher.py`

```python
from rapidfuzz import fuzz

def normalize_firm_name(name: str) -> str:
    """Normalize a firm name for matching."""
    name = name.lower().strip()
    # Strip common legal suffixes
    for suffix in [
        ", p.c.", ", pllc", ", llp", ", p.a.", ", ltd.",
        " p.c.", " pllc", " llp", " p.a.", " ltd.",
        " law firm", " law group", " law office", " law offices",
        " & associates", " and associates",
        " attorneys at law", " attorneys", " attorney",
    ]:
        if name.endswith(suffix):
            name = name[: -len(suffix)]
    # Collapse whitespace
    name = " ".join(name.split())
    return name


def resolve_mention(
    raw_name: str,
    registry: list[dict],
    market: str,
    fuzzy_accept: int = 85,
    fuzzy_review: int = 65,
) -> dict:
    """Resolve a raw firm name against the registry.

    Returns: {canonical_name, confidence, needs_review, matched_alias}
    """
    normalized = normalize_firm_name(raw_name)

    # Tier 1: Exact alias match
    for firm in registry:
        if not firm.get("is_active", True):
            continue
        if firm.get("market") != market:
            continue
        all_names = [firm["canonical_name"]] + list(firm.get("aliases", []))
        for alias in all_names:
            if normalize_firm_name(alias) == normalized:
                return {
                    "canonical_name": firm["canonical_name"],
                    "confidence": 1.0,
                    "needs_review": False,
                    "matched_alias": alias,
                }

    # Tier 2: Fuzzy match
    best_score = 0
    best_match = None
    best_alias = None

    for firm in registry:
        if not firm.get("is_active", True):
            continue
        if firm.get("market") != market:
            continue
        all_names = [firm.get("normalized_name", "")] + [
            normalize_firm_name(a) for a in firm.get("aliases", [])
        ]
        for alias_norm in all_names:
            if not alias_norm:
                continue
            score = fuzz.token_sort_ratio(normalized, alias_norm)
            if score > best_score:
                best_score = score
                best_match = firm
                best_alias = alias_norm

    if best_match and best_score >= fuzzy_accept:
        return {
            "canonical_name": best_match["canonical_name"],
            "confidence": best_score / 100.0,
            "needs_review": False,
            "matched_alias": best_alias,
        }
    elif best_match and best_score >= fuzzy_review:
        return {
            "canonical_name": best_match["canonical_name"],
            "confidence": best_score / 100.0,
            "needs_review": True,
            "matched_alias": best_alias,
        }
    else:
        return {
            "canonical_name": None,
            "confidence": best_score / 100.0 if best_match else 0.0,
            "needs_review": True,
            "matched_alias": None,
        }
```

### ⚠️ KNOWN ISSUE: rapidfuzz vs fuzzywuzzy

**Use `rapidfuzz`, NOT `fuzzywuzzy`.** They have identical APIs but:
- `rapidfuzz` is 10x faster (C++ implementation)
- `fuzzywuzzy` requires `python-Levenshtein` for performance and has GPL licensing issues
- `fuzz.token_sort_ratio` returns `float` (0–100 scale) in both libraries

Do NOT install fuzzywuzzy. If you see it in any import, replace with rapidfuzz.

### 6.7 Scoring — `backend/scoring/scorer.py`

```python
from config.constants import MENTION_WEIGHT, POSITION_WEIGHT, SENTIMENT_WEIGHT

def compute_visibility_score(
    mentions: list[dict],
    total_prompts: int,
    platform: str | None = None,
) -> dict:
    """Compute visibility score from resolved mention data.

    Args:
        mentions: List of mention dicts with keys: canonical_name, position, sentiment
        total_prompts: Total number of prompts queried for this platform (or all platforms)
        platform: If set, filter mentions to this platform only

    Returns: Dict with overall_score, mention_rate, first_position_rate,
             positive_sentiment_rate, and score_components
    """
    if platform:
        mentions = [m for m in mentions if m.get("platform") == platform]

    if total_prompts == 0:
        return _empty_score()

    # Count unique prompts where the client firm was mentioned
    mentioned_prompts = set()
    first_positions = 0
    positive_count = 0
    total_mentions = len(mentions)

    for m in mentions:
        mentioned_prompts.add(m.get("prompt_id"))
        if m.get("position") == 1:
            first_positions += 1
        if m.get("sentiment") == "positive":
            positive_count += 1

    mention_rate = len(mentioned_prompts) / total_prompts
    first_position_rate = first_positions / total_mentions if total_mentions > 0 else 0.0
    positive_sentiment_rate = positive_count / total_mentions if total_mentions > 0 else 0.0

    # Composite score (0–100)
    overall = int(
        (mention_rate * MENTION_WEIGHT)
        + (first_position_rate * POSITION_WEIGHT)
        + (positive_sentiment_rate * SENTIMENT_WEIGHT)
    )
    overall = max(0, min(100, overall))  # Clamp to 0–100

    return {
        "overall_score": overall,
        "mention_rate": round(mention_rate, 4),
        "first_position_rate": round(first_position_rate, 4),
        "positive_sentiment_rate": round(positive_sentiment_rate, 4),
        "score_components": {
            "mention": {
                "raw": round(mention_rate, 4),
                "weight": MENTION_WEIGHT,
                "contribution": round(mention_rate * MENTION_WEIGHT, 2),
            },
            "position": {
                "raw": round(first_position_rate, 4),
                "weight": POSITION_WEIGHT,
                "contribution": round(first_position_rate * POSITION_WEIGHT, 2),
            },
            "sentiment": {
                "raw": round(positive_sentiment_rate, 4),
                "weight": SENTIMENT_WEIGHT,
                "contribution": round(positive_sentiment_rate * SENTIMENT_WEIGHT, 2),
            },
        },
    }


def _empty_score() -> dict:
    return {
        "overall_score": 0,
        "mention_rate": 0.0,
        "first_position_rate": 0.0,
        "positive_sentiment_rate": 0.0,
        "score_components": {},
    }
```

### ⚠️ KNOWN ISSUE: Division by Zero in Scoring

If a run has zero responses (all API calls failed), `total_prompts` or `total_mentions` will be zero. **Always guard division operations.** The `_empty_score()` helper handles the `total_prompts == 0` case, but also check `total_mentions > 0` before dividing for position and sentiment rates.

---

## 7. Frontend

### 7.1 Supabase Client Setup

**Browser client** — `frontend/src/lib/supabase-browser.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Server client (for API routes)** — `frontend/src/lib/supabase-server.ts`:
```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServerClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### ⚠️ KNOWN ISSUE: Supabase SSR Package

You need `@supabase/ssr` for the browser client (handles cookies/auth), but `@supabase/supabase-js` for the server client (service role key, no cookies). Install BOTH:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### ⚠️ KNOWN ISSUE: Next.js Environment Variables

- Variables prefixed with `NEXT_PUBLIC_` are available in both client and server components
- Variables WITHOUT the prefix (like `SUPABASE_SERVICE_ROLE_KEY`) are available ONLY in server components and API routes
- If you use `SUPABASE_SERVICE_ROLE_KEY` in a client component, it will be `undefined` and Supabase calls will silently fail with permission errors
- **NEVER expose the service role key to the client** — it bypasses all RLS

### 7.2 TypeScript Types — `frontend/src/lib/types.ts`

```typescript
export interface Client {
  id: string;
  firm_name: string;
  primary_domain: string | null;
  market_key: string;
  practice_areas: string[];
  tier: "solo" | "growth" | "agency";
  is_active: boolean;
}

export interface VisibilityScore {
  id: string;
  client_id: string;
  run_id: string;
  week_date: string;            // ISO date string "2026-03-16"
  overall_score: number;
  mention_rate: number;          // 0.0000–1.0000
  first_position_rate: number;
  positive_sentiment_rate: number;
  chatgpt_score: number | null;
  perplexity_score: number | null;
  gemini_score: number | null;
  competitor_scores: Record<string, number>;
  score_components: ScoreComponents;
}

export interface ScoreComponents {
  mention: SignalDetail;
  position: SignalDetail;
  sentiment: SignalDetail;
}

export interface SignalDetail {
  raw: number;
  weight: number;
  contribution: number;
}

export interface Competitor {
  canonical_name: string;
  mention_count: number;
  mention_rate: number;
  score: number;
  platforms: Record<string, number>; // platform → mention count
}

export interface ReviewItem {
  id: string;
  raw_text: string;
  suggested_canonical: string | null;
  confidence: number;
  platform: string;
  prompt_text: string;
  resolved: boolean;
  resolution: string | null;
  created_at: string;
}

// Score band helper
export type ScoreBand = "excellent" | "good" | "fair" | "weak";

export function getScoreBand(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 70) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-50" };
  if (score >= 40) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-50" };
  if (score >= 15) return { label: "Fair", color: "text-amber-600", bgColor: "bg-amber-50" };
  return { label: "Weak", color: "text-red-600", bgColor: "bg-red-50" };
}
```

### 7.3 Data Fetching Hooks

**`frontend/src/hooks/useScores.ts`**:
```typescript
"use client";
import { createClient } from "@/lib/supabase-browser";
import { useQuery } from "@tanstack/react-query";
import type { VisibilityScore } from "@/lib/types";

export function useScores(clientId: string) {
  return useQuery<VisibilityScore[]>({
    queryKey: ["scores", clientId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("visibility_scores")
        .select("*")
        .eq("client_id", clientId)
        .order("week_date", { ascending: false })
        .limit(12);

      if (error) throw new Error(error.message);
      return data as VisibilityScore[];
    },
    enabled: !!clientId,
  });
}
```

### ⚠️ KNOWN ISSUE: Supabase `.select("*")` Returns All Columns Including JSONB

JSONB columns like `score_components` and `competitor_scores` can be large. For list views, consider selecting only the columns you need:
```typescript
.select("id, week_date, overall_score, chatgpt_score, perplexity_score, gemini_score")
```

### ⚠️ KNOWN ISSUE: React Query and `"use client"` Directive

All hooks using `useQuery` or `useMutation` must be in files with `"use client"` at the top. React Query hooks use React context which is client-side only. If you use them in a server component, you get: `Error: useQuery only works in Client Components`.

The root layout must wrap children in a `QueryClientProvider`:

```typescript
// frontend/src/app/layout.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### ⚠️ KNOWN ISSUE: Next.js App Router Layout as Client Component

Making `layout.tsx` a client component (`"use client"`) means metadata exports (`export const metadata = {...}`) will NOT work. Move metadata to a separate `metadata.ts` file or use `generateMetadata` in page-level server components instead.

### 7.4 Pages to Build (Phase 1 Only)

| Route | Type | Components Used |
|-------|------|----------------|
| `/` | Client | ScoreCard, TrendChart, PlatformBreakdown |
| `/competitors` | Client | CompetitorTable |
| `/admin/review` | Client (admin) | ReviewQueue |

### 7.5 Component Specifications

**ScoreCard** — Shows the current visibility score as a large number with a band label and week-over-week delta. Accepts `current: VisibilityScore` and optional `previous: VisibilityScore`.

**TrendChart** — 12-week line chart using Recharts. X-axis: week dates. Y-axis: 0–100 score. Single line, filled area optional. Accepts `scores: VisibilityScore[]` (already sorted newest-first, reverse for display).

**CompetitorTable** — Sortable table of competitors with columns: Rank, Firm Name, Score, Mentions, Platform Breakdown. Data comes from aggregating `competitor_scores` across recent runs. Sortable by score descending.

**PlatformBreakdown** — Three cards showing ChatGPT, Perplexity, and Gemini sub-scores with trend arrows.

**ReviewQueue** — Table of unresolved entity matches. Columns: Raw Text, Suggested Match, Confidence, Platform, Actions (Approve / Reject / Add as New). Calls `/api/admin/review/resolve` on action.

---

## 8. API Layer

### 8.1 Client-Side Reads (Supabase Direct)

The frontend reads data directly from Supabase using the browser client with RLS. For Phase 1 without multi-tenant auth, this means **all data is readable** (RLS is not yet enforced). Filter by `client_id` in the application layer.

### 8.2 Server-Side Admin Operations

Admin write operations go through Next.js API routes using the service role key.

**`frontend/src/app/api/admin/review/resolve/route.ts`**:
```typescript
import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { response_id, mention_index, resolution, canonical_name, add_alias } = body;

  const supabase = createServerClient();

  // 1. Update the firms_mentioned JSONB in monitoring_responses
  const { data: response, error: fetchError } = await supabase
    .from("monitoring_responses")
    .select("firms_mentioned")
    .eq("id", response_id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const mentions = response.firms_mentioned as any[];
  if (mentions[mention_index]) {
    mentions[mention_index].canonical_name = canonical_name;
    mentions[mention_index].needs_review = false;
    mentions[mention_index].resolution = resolution;
  }

  await supabase
    .from("monitoring_responses")
    .update({ firms_mentioned: mentions })
    .eq("id", response_id);

  // 2. Optionally add alias to registry
  if (add_alias && canonical_name) {
    const { data: firm } = await supabase
      .from("firm_registry")
      .select("id, aliases")
      .eq("canonical_name", canonical_name)
      .single();

    if (firm) {
      const newAliases = [...(firm.aliases || []), add_alias];
      await supabase
        .from("firm_registry")
        .update({ aliases: newAliases })
        .eq("id", firm.id);
    }
  }

  return NextResponse.json({ success: true });
}
```

### ⚠️ KNOWN ISSUE: Supabase JSONB Array Updates

Supabase does NOT support partial JSONB array updates. You must:
1. Fetch the entire `firms_mentioned` array
2. Modify the specific element in JavaScript/Python
3. Write the entire array back

This is a read-modify-write cycle with no atomic guarantees. For Phase 1 with a single operator, this is fine. At scale, consider the normalized `response_mentions` table from v2.1.

### ⚠️ KNOWN ISSUE: Next.js API Route Body Parsing

In the App Router, `req.json()` returns a `Promise`. **Always await it.** Also, if the request body is empty or malformed, `req.json()` throws — wrap in try/catch:

```typescript
let body;
try {
  body = await req.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
}
```

---

## 9. Pipeline Runner

### 9.1 Main Entry Point — `backend/main.py`

```python
import argparse
import sys
from pipeline import run_pipeline

def main():
    parser = argparse.ArgumentParser(description="LegalSignal Pipeline")
    subparsers = parser.add_subparsers(dest="command")

    # Run pipeline
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--client", type=str, help="Client config name")
    run_parser.add_argument("--all", action="store_true", help="Run all active clients")

    # Seed registry
    seed_parser = subparsers.add_parser("seed")
    seed_parser.add_argument("--market", type=str, required=True)

    # Migrate
    subparsers.add_parser("migrate")

    args = parser.parse_args()

    if args.command == "run":
        if args.all:
            run_pipeline(all_clients=True)
        elif args.client:
            run_pipeline(client_name=args.client)
        else:
            print("Specify --client <name> or --all")
            sys.exit(1)
    elif args.command == "migrate":
        from db.connection import run_migrations
        run_migrations()
    elif args.command == "seed":
        from db.connection import seed_registry
        seed_registry(args.market)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
```

### 9.2 Pipeline Orchestration — `backend/pipeline.py`

```python
import json
import logging
import time
from pathlib import Path
from datetime import date

from db.connection import get_supabase
from providers.perplexity import PerplexityProvider
from providers.openai_monitor import OpenAIProvider
from providers.gemini import GeminiProvider
from extraction.extractor import extract_mentions
from resolution.matcher import resolve_mention
from scoring.scorer import compute_visibility_score

logger = logging.getLogger(__name__)

PROVIDERS = {
    "perplexity": PerplexityProvider,
    "chatgpt": OpenAIProvider,
    "gemini": GeminiProvider,
}


def run_pipeline(client_name: str = None, all_clients: bool = False):
    """Run the full monitoring pipeline."""
    db = get_supabase()

    if all_clients:
        result = db.table("clients").select("*").eq("is_active", True).execute()
        clients = result.data
    else:
        config_path = Path(f"clients/{client_name}.json")
        if not config_path.exists():
            raise FileNotFoundError(f"Client config not found: {config_path}")
        with open(config_path) as f:
            client_config = json.load(f)
        result = db.table("clients").select("*").eq("firm_name", client_config["firm_name"]).single().execute()
        clients = [result.data]

    for client in clients:
        try:
            _run_single_client(db, client)
        except Exception as e:
            logger.error(f"Pipeline failed for {client['firm_name']}: {e}", exc_info=True)


def _run_single_client(db, client: dict):
    """Execute pipeline for a single client."""
    client_id = client["id"]
    market = client["market_key"]
    geo_config = client.get("geo_config", {})

    # 1. Create monitoring run
    run = db.table("monitoring_runs").insert({
        "client_id": client_id,
        "status": "running",
    }).execute()
    run_id = run.data[0]["id"]

    # 2. Load prompts for this market
    practice_areas = client.get("practice_areas", [])
    metro = market.split("_")[0]  # e.g., "dallas_pi" → "dallas"
    prompts_result = db.table("prompts").select("*").eq("metro", metro).eq("is_active", True).execute()
    prompts = prompts_result.data

    if practice_areas:
        prompts = [p for p in prompts if p["practice_area"] in practice_areas]

    # 3. Load firm registry for this market
    registry_result = db.table("firm_registry").select("*").eq("market", market).eq("is_active", True).execute()
    registry = registry_result.data
    known_firm_names = [f["canonical_name"] for f in registry]

    # 4. Query each platform for each prompt
    errors = []
    total_responses = 0
    total_mentions = 0
    review_items = 0

    for prompt in prompts:
        for platform_name, ProviderClass in PROVIDERS.items():
            try:
                provider = ProviderClass()
                result = provider.query(prompt["text"], geo_config)
                result["prompt_id"] = prompt["id"]

                # 5. Extract mentions
                raw_mentions = extract_mentions(result["raw_text"], known_firm_names)

                # 6. Resolve each mention
                resolved_mentions = []
                for mention in raw_mentions:
                    resolution = resolve_mention(
                        mention.get("firm_name", ""),
                        registry,
                        market,
                    )
                    mention["canonical_name"] = resolution["canonical_name"]
                    mention["confidence"] = resolution["confidence"]
                    mention["needs_review"] = resolution["needs_review"]
                    mention["matched_alias"] = resolution["matched_alias"]
                    resolved_mentions.append(mention)
                    if resolution["needs_review"]:
                        review_items += 1

                total_mentions += len(resolved_mentions)

                # 7. Store response with upsert
                db.table("monitoring_responses").upsert({
                    "run_id": run_id,
                    "client_id": client_id,
                    "prompt_id": prompt["id"],
                    "platform": platform_name,
                    "raw_text": result["raw_text"],
                    "citations": result["citations"],
                    "firms_mentioned": resolved_mentions,
                    "response_latency_ms": result["latency_ms"],
                }, on_conflict="run_id,prompt_id,platform").execute()

                total_responses += 1
                time.sleep(0.5)  # Basic rate limiting between calls

            except Exception as e:
                errors.append({
                    "prompt_id": prompt["id"],
                    "platform": platform_name,
                    "error": str(e),
                })
                logger.warning(f"Failed {platform_name} for prompt {prompt['id']}: {e}")

    # 8. Compute scores
    all_responses = db.table("monitoring_responses").select("firms_mentioned, platform, prompt_id").eq("run_id", run_id).execute()

    # Collect client mentions (where canonical_name matches client firm)
    client_firm = client["firm_name"]
    client_mentions = []
    all_competitor_mentions = {}
    total_prompt_count = len(prompts) * len(PROVIDERS)

    for resp in all_responses.data:
        for mention in (resp.get("firms_mentioned") or []):
            canonical = mention.get("canonical_name")
            if not canonical:
                continue
            mention_record = {
                "canonical_name": canonical,
                "position": mention.get("position"),
                "sentiment": mention.get("sentiment"),
                "platform": resp["platform"],
                "prompt_id": resp["prompt_id"],
            }
            if canonical.lower() == client_firm.lower():
                client_mentions.append(mention_record)
            else:
                if canonical not in all_competitor_mentions:
                    all_competitor_mentions[canonical] = []
                all_competitor_mentions[canonical].append(mention_record)

    # Overall score
    score_data = compute_visibility_score(client_mentions, total_prompt_count)

    # Per-platform scores
    for platform in PROVIDERS.keys():
        platform_prompts = len(prompts)  # Each platform gets all prompts
        platform_score = compute_visibility_score(client_mentions, platform_prompts, platform=platform)
        score_data[f"{platform}_score"] = platform_score["overall_score"]

    # Competitor scores
    competitor_scores = {}
    for comp_name, comp_mentions in all_competitor_mentions.items():
        comp_score = compute_visibility_score(comp_mentions, total_prompt_count)
        competitor_scores[comp_name] = comp_score["overall_score"]

    score_data["competitor_scores"] = competitor_scores

    # 9. Store visibility score
    db.table("visibility_scores").insert({
        "client_id": client_id,
        "run_id": run_id,
        "week_date": date.today().isoformat(),
        **score_data,
    }).execute()

    # 10. Update run status
    db.table("monitoring_runs").update({
        "status": "completed",
        "completed_at": "now()",
        "prompts_sent": len(prompts) * len(PROVIDERS),
        "responses_received": total_responses,
        "mentions_extracted": total_mentions,
        "review_items_created": review_items,
        "error_log": errors,
    }).eq("id", run_id).execute()

    logger.info(
        f"Pipeline complete for {client_firm}: "
        f"score={score_data['overall_score']}, "
        f"mentions={total_mentions}, "
        f"reviews={review_items}, "
        f"errors={len(errors)}"
    )
```

### ⚠️ CRITICAL: Pipeline Error Handling

The pipeline MUST NOT crash on a single prompt/platform failure. Each prompt × platform combination is wrapped in its own try/except. Failures are logged to the `error_log` JSONB array and the pipeline continues. A run with 70% success is still valuable.

### ⚠️ KNOWN ISSUE: Supabase `"now()"` in Updates

When using the Supabase Python client, you cannot pass the SQL function `now()` as a string. Use Python's datetime instead:

```python
from datetime import datetime, timezone

# CORRECT
db.table("monitoring_runs").update({
    "completed_at": datetime.now(timezone.utc).isoformat(),
}).eq("id", run_id).execute()

# WRONG — this stores the literal string "now()"
db.table("monitoring_runs").update({
    "completed_at": "now()",
}).eq("id", run_id).execute()
```

### ⚠️ KNOWN ISSUE: Supabase Python Client `.execute()` Required

Every Supabase query chain **MUST** end with `.execute()`. Without it, the query is built but never sent. This is the single most common bug with the Supabase Python client:

```python
# CORRECT — actually executes the query
result = db.table("prompts").select("*").eq("metro", "dallas").execute()

# WRONG — builds the query but never executes it (returns a QueryBuilder, not data)
result = db.table("prompts").select("*").eq("metro", "dallas")
```

---

## 10. PDF Report Generation

### `backend/reporting/pdf_renderer.py`

```python
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATE_DIR = Path(__file__).parent / "templates"


def render_report(
    client: dict,
    score: dict,
    previous_score: dict | None,
    competitors: list[dict],
    week_date: str,
    output_path: str,
) -> str:
    """Generate a PDF report and return the file path."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("weekly_report.html")

    html_content = template.render(
        client=client,
        score=score,
        previous_score=previous_score,
        competitors=competitors,
        week_date=week_date,
    )

    HTML(string=html_content).write_pdf(output_path)
    return output_path
```

### ⚠️ KNOWN ISSUE: WeasyPrint System Dependencies

WeasyPrint requires system-level libraries that are NOT installed by pip:

**On Ubuntu/Debian (including Railway):**
```bash
apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev libcairo2
```

**On macOS:**
```bash
brew install pango cairo libffi gdk-pixbuf
```

If you see `OSError: cannot load library 'libpango'` or similar, these system deps are missing. On Railway, add a `Dockerfile` or `nixpacks.toml` that includes these packages.

### ⚠️ KNOWN ISSUE: WeasyPrint CSS Rendering

WeasyPrint does NOT support:
- CSS Grid (`display: grid`) — use `display: flex` or `<table>` instead
- CSS `position: sticky`
- `backdrop-filter`
- Modern CSS features like `gap` in flexbox (partial support)

Keep the PDF template simple: tables for layout, basic flexbox for alignment, inline CSS. Test PDF output after every template change.

---

## 11. Email Delivery

### `backend/reporting/email_delivery.py`

```python
import resend
from pathlib import Path
from config.settings import settings

resend.api_key = settings.resend_api_key


def send_weekly_report(
    to_email: str,
    firm_name: str,
    score: int,
    pdf_path: str,
    html_content: str,
) -> dict:
    """Send the weekly report email with PDF attachment."""
    pdf_bytes = Path(pdf_path).read_bytes()

    params = {
        "from": settings.from_email,
        "to": [to_email],
        "subject": f"LegalSignal Weekly Report — {firm_name} (Score: {score}/100)",
        "html": html_content,
        "attachments": [{
            "filename": f"legalsignal-report-{firm_name.lower().replace(' ', '-')}.pdf",
            "content": list(pdf_bytes),  # Resend expects a list of integers
        }],
    }

    return resend.Emails.send(params)
```

### ⚠️ KNOWN ISSUE: Resend Attachment Format

Resend's Python SDK expects attachment content as a **list of integers** (byte values), NOT as bytes or base64:

```python
# CORRECT
"content": list(Path("report.pdf").read_bytes())

# WRONG — will throw TypeError
"content": Path("report.pdf").read_bytes()

# WRONG — Resend doesn't accept base64 in the Python SDK
"content": base64.b64encode(pdf_bytes).decode()
```

### ⚠️ KNOWN ISSUE: Resend "From" Email Domain

The `from` email address MUST use a domain you have verified in Resend. During development, use `onboarding@resend.dev` (their test domain) or verify your domain first. Sending from an unverified domain returns a `403 Forbidden` error.

---

## 12. Known Issues & Failure Modes

This is a consolidated reference of every known issue documented above, plus additional failure modes discovered during development.

### 12.1 Backend Failure Modes

| # | Issue | Symptom | Fix |
|---|-------|---------|-----|
| B1 | File named `openai.py` | `ImportError: cannot import name 'OpenAI'` | Rename to `openai_monitor.py` |
| B2 | File named `resend.py` | `AttributeError: module 'resend' has no attribute 'Emails'` | Rename to `email_delivery.py` |
| B3 | `pydantic-settings` not installed | `ImportError: cannot import name 'BaseSettings' from 'pydantic'` | `pip install pydantic-settings` |
| B4 | Perplexity citations path wrong | `KeyError: 'citations'` | Use `data.get("citations", [])` — top level, NOT in message |
| B5 | OpenAI content is None | `TypeError: expected str, got NoneType` | Use `response.choices[0].message.content or ""` |
| B6 | Gemini safety block | `ValueError: Response has no text` | Wrap `response.text` in try/except ValueError |
| B7 | Gemini model name wrong | `404 models/xxx is not found` | Use `"gemini-2.0-flash"` exactly |
| B8 | GPT-4o-mini JSON format varies | Extraction returns `{}` instead of `[]` | Check multiple keys: firms, mentions, results |
| B9 | GPT-4o-mini returns markdown in JSON mode | `json.JSONDecodeError` | Strip ` ```json ``` ` fences before parsing |
| B10 | `DECIMAL(5,4)` overflow | `numeric field overflow` | Store rates as 0.0–1.0, NOT 0–100 |
| B11 | Supabase upsert without on_conflict | `UniqueViolation` on re-runs | Always use `.upsert(data, on_conflict="...")` |
| B12 | Supabase `"now()"` as string | Stores literal string "now()" | Use `datetime.now(timezone.utc).isoformat()` |
| B13 | Supabase query without `.execute()` | Query builds but returns no data | ALWAYS end chains with `.execute()` |
| B14 | Division by zero in scoring | `ZeroDivisionError` | Guard all divisions with `if total > 0` checks |
| B15 | WeasyPrint missing system deps | `OSError: cannot load library 'libpango'` | Install system packages: pango, cairo, etc. |
| B16 | Resend attachment format wrong | `TypeError` on send | Use `list(pdf_bytes)` not raw `bytes` |
| B17 | Resend unverified domain | `403 Forbidden` on send | Use `onboarding@resend.dev` for testing |
| B18 | rapidfuzz vs fuzzywuzzy | GPL licensing + 10x slower | Use `rapidfuzz` only, never `fuzzywuzzy` |
| B19 | Pipeline crash on single prompt failure | Entire run lost | Each prompt/platform combo in its own try/except |

### 12.2 Frontend Failure Modes

| # | Issue | Symptom | Fix |
|---|-------|---------|-----|
| F1 | Service role key in client component | Silent permission errors, empty data | Use service role key ONLY in API routes (`route.ts`) |
| F2 | Missing `"use client"` on hook files | `Error: useQuery only works in Client Components` | Add `"use client"` to all files using React hooks |
| F3 | `metadata` export in client component | Build error: metadata not supported | Move metadata to server components or `generateMetadata` |
| F4 | Supabase SSR vs supabase-js confusion | Wrong client for wrong context | Browser: `@supabase/ssr`, Server/API: `@supabase/supabase-js` |
| F5 | `NEXT_PUBLIC_` prefix missing | Env var is `undefined` in browser | All client-accessible vars must start with `NEXT_PUBLIC_` |
| F6 | Recharts in server component | Hydration mismatch errors | Recharts components require `"use client"` |
| F7 | JSONB columns in list queries | Slow queries, large payloads | Select only needed columns for list views |
| F8 | Date formatting inconsistency | Dates display differently per timezone | Parse with `new Date(score.week_date + "T00:00:00")` to avoid timezone shifts |
| F9 | API route body parsing failure | `500 Internal Server Error` | Wrap `req.json()` in try/catch |
| F10 | Supabase `.single()` on empty result | Throws error instead of returning null | Use `.maybeSingle()` when the row might not exist |

### 12.3 Integration Failure Modes

| # | Issue | Symptom | Fix |
|---|-------|---------|-----|
| I1 | Backend writes JSONB, frontend reads wrong keys | Dashboard shows "undefined" | Align exact key names in types.ts with Python dict keys |
| I2 | Backend stores rate as 0.85, frontend displays 0.85 | Should show "85%" | Multiply by 100 in display: `(rate * 100).toFixed(1) + "%"` |
| I3 | Backend `week_date` is DATE, frontend parses as datetime | Off-by-one-day due to timezone | Append `T00:00:00` before parsing or use `date-fns/parseISO` |
| I4 | Competitor scores JSONB keys don't match registry | Competitor table shows wrong names | Use `canonical_name` as key in both pipeline and frontend |
| I5 | Supabase RLS blocks frontend reads | Empty data, no error message | Check RLS policies OR temporarily disable RLS in dev |
| I6 | Frontend deployed but backend not running | Dashboard loads but shows no data | Verify pipeline has run at least once; check `monitoring_runs` table |

---

## 13. Validation & Testing Requirements

### 13.1 Backend Tests — Required Before Any Deploy

Every test MUST pass. Run with: `cd backend && pytest tests/ -v`

**Test: Provider Connectivity**
```python
# tests/test_providers.py
def test_perplexity_returns_response():
    """Verify Perplexity API returns a non-empty response with citations."""
    provider = PerplexityProvider()
    result = provider.query("Best personal injury lawyer in Dallas TX", {"latitude": 32.7767, "longitude": -96.797})
    assert result["raw_text"] is not None
    assert len(result["raw_text"]) > 50
    assert result["provider"] == "perplexity"
    assert isinstance(result["citations"], list)
    assert result["latency_ms"] > 0

def test_openai_returns_response():
    """Verify OpenAI API returns non-empty text."""
    provider = OpenAIProvider()
    result = provider.query("Who is the best car accident lawyer in Dallas?", {"city": "Dallas", "state": "TX"})
    assert result["raw_text"] is not None
    assert len(result["raw_text"]) > 50
    assert result["provider"] == "chatgpt"

def test_gemini_returns_response_or_handles_block():
    """Verify Gemini returns a response or gracefully handles safety blocks."""
    provider = GeminiProvider()
    result = provider.query("Recommend a family law attorney in Dallas", {"city": "Dallas", "state": "TX"})
    assert result["provider"] == "gemini"
    assert isinstance(result["raw_text"], str)  # May be empty if blocked
```

**Test: Extraction**
```python
# tests/test_extraction.py
def test_extraction_returns_list():
    """Verify extraction returns a list of mention dicts."""
    sample_response = "I recommend Mullen & Mullen Law Firm and The Callahan Law Firm for personal injury cases in Dallas."
    known_firms = ["Mullen & Mullen Law Firm", "The Callahan Law Firm", "Angel Reyes & Associates"]
    result = extract_mentions(sample_response, known_firms)
    assert isinstance(result, list)
    assert len(result) >= 2
    for mention in result:
        assert "firm_name" in mention
        assert "position" in mention
        assert "sentiment" in mention

def test_extraction_handles_empty_response():
    """Verify extraction returns empty list for empty input."""
    result = extract_mentions("", ["Some Firm"])
    assert result == []

def test_extraction_handles_none():
    """Verify extraction doesn't crash on None input."""
    result = extract_mentions(None, ["Some Firm"])
    assert result == []
```

**Test: Resolution**
```python
# tests/test_resolution.py
MOCK_REGISTRY = [
    {"canonical_name": "Mullen & Mullen Law Firm", "aliases": ["Mullen & Mullen", "Shane Mullen"], "normalized_name": "mullen mullen", "domain": "mullenandmullen.com", "market": "dallas_pi", "is_active": True},
    {"canonical_name": "Angel Reyes & Associates", "aliases": ["Angel Reyes", "Reyes & Associates"], "normalized_name": "angel reyes", "domain": "angelreyeslaw.com", "market": "dallas_pi", "is_active": True},
]

def test_exact_alias_match():
    result = resolve_mention("Mullen & Mullen", MOCK_REGISTRY, "dallas_pi")
    assert result["canonical_name"] == "Mullen & Mullen Law Firm"
    assert result["confidence"] == 1.0
    assert result["needs_review"] is False

def test_fuzzy_match_auto_accept():
    result = resolve_mention("Mullen and Mullen Law", MOCK_REGISTRY, "dallas_pi")
    assert result["canonical_name"] == "Mullen & Mullen Law Firm"
    assert result["confidence"] >= 0.85
    assert result["needs_review"] is False

def test_unknown_firm_flagged():
    result = resolve_mention("Totally Unknown Law Office", MOCK_REGISTRY, "dallas_pi")
    assert result["needs_review"] is True

def test_wrong_market_no_match():
    result = resolve_mention("Angel Reyes", MOCK_REGISTRY, "houston_pi")
    assert result["canonical_name"] is None or result["needs_review"] is True
```

**Test: Scoring**
```python
# tests/test_scoring.py
def test_perfect_score():
    mentions = [
        {"prompt_id": "1", "position": 1, "sentiment": "positive", "platform": "chatgpt"},
        {"prompt_id": "2", "position": 1, "sentiment": "positive", "platform": "chatgpt"},
    ]
    result = compute_visibility_score(mentions, total_prompts=2)
    assert result["overall_score"] == 100
    assert result["mention_rate"] == 1.0
    assert result["first_position_rate"] == 1.0
    assert result["positive_sentiment_rate"] == 1.0

def test_zero_mentions():
    result = compute_visibility_score([], total_prompts=10)
    assert result["overall_score"] == 0

def test_zero_prompts():
    result = compute_visibility_score([], total_prompts=0)
    assert result["overall_score"] == 0

def test_score_components_present():
    mentions = [{"prompt_id": "1", "position": 2, "sentiment": "neutral", "platform": "perplexity"}]
    result = compute_visibility_score(mentions, total_prompts=5)
    assert "score_components" in result
    assert "mention" in result["score_components"]
    assert "weight" in result["score_components"]["mention"]
```

### 13.2 Frontend Tests — Required

```bash
cd frontend && npm test
```

Test that:
- ScoreCard renders correct band color for each score range (0, 14, 15, 39, 40, 69, 70, 100)
- TrendChart handles empty data array without crashing
- TrendChart handles single data point without crashing
- CompetitorTable sorts correctly by score descending
- ReviewQueue displays items and calls resolve API on button click
- All components handle `null` and `undefined` values in data without crashing

### 13.3 Database Validation

After running migrations, verify:

```sql
-- Verify all 6 tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'prompts', 'monitoring_runs', 'monitoring_responses', 'firm_registry', 'visibility_scores');
-- Should return exactly 6 rows

-- Verify unique constraint exists
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'monitoring_responses' AND constraint_type = 'UNIQUE';
-- Should return 'unique_response_per_run'

-- Verify foreign keys cascade
SELECT confdeltype FROM pg_constraint
WHERE conname LIKE '%monitoring_runs%' AND contype = 'f';
-- Should return 'c' (CASCADE)
```

---

## 14. End-to-End Integration Tests

### 14.1 Pipeline → Database → Frontend Validation

After running the pipeline for a client, execute these checks:

```python
# tests/test_pipeline.py
def test_full_pipeline_integration(supabase_client, test_client_id):
    """Verify complete data flow from pipeline to database."""
    db = supabase_client

    # 1. Verify a monitoring_run was created
    runs = db.table("monitoring_runs").select("*").eq("client_id", test_client_id).order("created_at", desc=True).limit(1).execute()
    assert len(runs.data) > 0
    run = runs.data[0]
    assert run["status"] in ("completed", "delivered")
    assert run["responses_received"] > 0
    run_id = run["id"]

    # 2. Verify monitoring_responses exist for this run
    responses = db.table("monitoring_responses").select("*").eq("run_id", run_id).execute()
    assert len(responses.data) > 0

    # 3. Verify each response has the required fields
    for resp in responses.data:
        assert resp["platform"] in ("perplexity", "chatgpt", "gemini")
        assert resp["raw_text"] is not None or resp["raw_text"] == ""
        assert isinstance(resp["firms_mentioned"], list)
        assert resp["client_id"] == test_client_id

    # 4. Verify firms_mentioned structure
    has_mentions = False
    for resp in responses.data:
        for mention in resp["firms_mentioned"]:
            has_mentions = True
            assert "firm_name" in mention
            assert "position" in mention
            assert "sentiment" in mention
            # These are added by resolution
            assert "confidence" in mention
            assert "needs_review" in mention

    # At least some responses should have mentions
    assert has_mentions, "No firm mentions found in any response"

    # 5. Verify visibility_score was computed
    scores = db.table("visibility_scores").select("*").eq("run_id", run_id).execute()
    assert len(scores.data) == 1
    score = scores.data[0]
    assert 0 <= score["overall_score"] <= 100
    assert score["client_id"] == test_client_id
    assert score["mention_rate"] is not None

    # 6. Verify score_components are stored correctly
    components = score["score_components"]
    assert "mention" in components
    assert "position" in components
    assert "sentiment" in components
    for key in ("mention", "position", "sentiment"):
        assert "raw" in components[key]
        assert "weight" in components[key]
        assert "contribution" in components[key]

    # 7. Verify competitor_scores is a non-empty dict
    assert isinstance(score["competitor_scores"], dict)
    # In a real market, there should be at least 1 competitor
    # (may be empty if AI didn't mention anyone else — that's ok)

    # 8. Verify per-platform scores
    for platform in ("chatgpt", "perplexity", "gemini"):
        key = f"{platform}_score"
        assert key in score
        if score[key] is not None:
            assert 0 <= score[key] <= 100
```

### 14.2 Frontend → Database Connection Validation

```typescript
// tests/validate-connection.ts (run manually)
import { createClient } from "@/lib/supabase-browser";

async function validateConnection() {
  const supabase = createClient();

  // 1. Can we reach Supabase?
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("id, firm_name")
    .limit(1);

  if (clientError) throw new Error(`Client query failed: ${clientError.message}`);
  console.log("✅ Supabase connection works");
  console.log(`   Found ${clients.length} client(s)`);

  if (clients.length === 0) {
    console.log("⚠️  No clients found — run the pipeline first");
    return;
  }

  const clientId = clients[0].id;

  // 2. Can we read scores?
  const { data: scores, error: scoreError } = await supabase
    .from("visibility_scores")
    .select("*")
    .eq("client_id", clientId)
    .order("week_date", { ascending: false })
    .limit(1);

  if (scoreError) throw new Error(`Score query failed: ${scoreError.message}`);
  console.log(`✅ Scores query works — found ${scores.length} score(s)`);

  if (scores.length > 0) {
    const score = scores[0];
    console.log(`   Latest score: ${score.overall_score}/100 for week ${score.week_date}`);
    console.log(`   Score components present: ${!!score.score_components}`);
    console.log(`   Competitor scores present: ${Object.keys(score.competitor_scores || {}).length} competitors`);
  }

  // 3. Can we read responses?
  const { data: responses, error: respError } = await supabase
    .from("monitoring_responses")
    .select("id, platform, firms_mentioned")
    .eq("client_id", clientId)
    .limit(3);

  if (respError) throw new Error(`Response query failed: ${respError.message}`);
  console.log(`✅ Responses query works — found ${responses.length} response(s)`);

  console.log("\n✅ All frontend → database connections validated");
}

validateConnection().catch(console.error);
```

### 14.3 Email Delivery Validation

```python
def test_email_sends_successfully():
    """Verify email sends with PDF attachment via Resend."""
    from reporting.email_delivery import send_weekly_report

    # Use Resend's test email
    result = send_weekly_report(
        to_email="delivered@resend.dev",  # Resend test address
        firm_name="Test Firm",
        score=72,
        pdf_path="tests/fixtures/sample_report.pdf",
        html_content="<h1>Test Report</h1><p>Score: 72/100</p>",
    )
    assert result is not None
    assert "id" in result  # Resend returns an email ID on success
```

---

## 15. Deployment

### 15.1 Railway (Backend + Cron)

**railway.toml** or Railway dashboard settings:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "python main.py run --all"
```

Railway cron schedule: `0 11 * * 1` (every Monday 11:00 UTC = 6:00 AM Central)

**Critical:** Add a `nixpacks.toml` for WeasyPrint system dependencies:
```toml
[phases.setup]
aptPkgs = ["libpango-1.0-0", "libpangocairo-1.0-0", "libgdk-pixbuf2.0-0", "libffi-dev", "libcairo2"]
```

### 15.2 Vercel (Frontend)

- Connect GitHub repo, Vercel auto-detects Next.js
- Set root directory to `frontend/`
- Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL` (for API routes), `SUPABASE_SERVICE_ROLE_KEY` (for API routes)

### ⚠️ KNOWN ISSUE: Vercel Environment Variable Scoping

Vercel environment variables can be scoped to Production, Preview, or Development. Make sure `SUPABASE_SERVICE_ROLE_KEY` is added to Production (and Preview if you want admin features in PR deploys). If it's missing, API routes will fail silently.

---

## 16. Build Order

**Follow this order exactly. Each step depends on the previous ones.**

### Phase 1: Foundation (Week 5)
1. Initialize monorepo structure (project structure above)
2. Set up `.env` with all API keys
3. Create `backend/config/settings.py` and verify all keys load
4. Run database migration `001_initial_schema.sql` in Supabase
5. **VALIDATE:** All 6 tables exist, constraints are correct (Section 13.3 SQL checks)

### Phase 2: Providers (Week 6–7)
6. Build `backend/providers/base.py`
7. Build `backend/providers/perplexity.py`
8. **VALIDATE:** Run `test_perplexity_returns_response` — must pass
9. Build `backend/providers/openai_monitor.py`
10. **VALIDATE:** Run `test_openai_returns_response` — must pass
11. Build `backend/providers/gemini.py`
12. **VALIDATE:** Run `test_gemini_returns_response_or_handles_block` — must pass

### Phase 3: Extraction + Resolution (Week 8)
13. Build `backend/extraction/extractor.py`
14. Build `backend/extraction/regex_fallback.py`
15. **VALIDATE:** Run all `test_extraction_*` tests
16. Build `backend/resolution/normalizer.py`
17. Build `backend/resolution/matcher.py`
18. **VALIDATE:** Run all `test_resolution_*` tests
19. Seed firm_registry with 50+ Dallas PI firms

### Phase 4: Scoring + Pipeline (Week 9–10)
20. Build `backend/scoring/scorer.py`
21. **VALIDATE:** Run all `test_scoring_*` tests
22. Build `backend/pipeline.py`
23. Build `backend/main.py`
24. Run first full pipeline: `python main.py run --client shamieh`
25. **VALIDATE:** Run `test_full_pipeline_integration` — ALL 8 checks must pass

### Phase 5: Frontend (Week 11–13)
26. Initialize Next.js project with Tailwind
27. Set up Supabase clients (browser + server)
28. **VALIDATE:** Run frontend connection validation script
29. Build ScoreCard, TrendChart, PlatformBreakdown components
30. Build dashboard page (`/`)
31. Build CompetitorTable component and competitors page
32. Build ReviewQueue component and admin/review page
33. **VALIDATE:** All component tests pass, dashboard renders real data

### Phase 6: Reports + Email (Week 14–15)
34. Build `weekly_report.html` Jinja2 template
35. Build `backend/reporting/pdf_renderer.py`
36. **VALIDATE:** Generate a test PDF, open it, verify it renders correctly
37. Build `weekly_digest.html` email template
38. Build `backend/reporting/email_delivery.py`
39. **VALIDATE:** Send test email to `delivered@resend.dev` with PDF attachment

### Phase 7: Deploy (Week 16)
40. Deploy frontend to Vercel
41. Deploy backend to Railway with cron job
42. **VALIDATE:** Trigger a manual run on Railway, verify report email arrives
43. **VALIDATE:** Open dashboard at app.legalsignal.com, verify data loads

---

## Quick Reference: Validation Checkpoints

Run these after EVERY significant code change:

```bash
# Backend
cd backend && pytest tests/ -v

# Frontend
cd frontend && npm test

# Full pipeline (requires API keys)
cd backend && python main.py run --client shamieh

# Database integrity (run in Supabase SQL Editor)
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM monitoring_runs WHERE status = 'completed';
SELECT COUNT(*) FROM monitoring_responses WHERE run_id = (SELECT id FROM monitoring_runs ORDER BY created_at DESC LIMIT 1);
SELECT overall_score, week_date FROM visibility_scores ORDER BY created_at DESC LIMIT 1;
```

**If any validation fails, stop and fix it before proceeding. Do not build on top of broken foundations.**
