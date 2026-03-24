# First Pipeline Run — Results & Analysis

> **Date:** 2026-03-23
> **Client:** Mullen & Mullen Law Firm (Dallas, TX — Personal Injury)
> **Run ID:** fea05d28-c2a3-4b13-b598-69d2196e1702

---

## Overall Score: 37/100 (Weak)

The score falls in the **Weak** band (15–39), meaning Mullen & Mullen has limited visibility across AI search engines. The firm is mentioned in about 1 in 4 queries and rarely appears as the first recommendation.

### Score Breakdown

| Component | Value | Weight | Contribution |
|-----------|-------|--------|-------------|
| Mention Rate | 27.8% | x50 | 13.9 |
| 1st Position Rate | 13.3% | x30 | 4.0 |
| Positive Sentiment | 100% | x20 | 20.0 |
| **Weighted Total** | | | **~37** |

**Interpretation:**
- The firm is mentioned in 27.8% of the 36 prompts sent — meaning most legal search queries don't surface it
- When mentioned, it's listed first only 13.3% of the time — competitors take the top spot
- The good news: when mentioned, sentiment is always positive (100%)

---

## Platform Performance

| Platform | Responses | Mentions | Unique Firms | Platform Score |
|----------|-----------|----------|-------------|----------------|
| ChatGPT (GPT-4o) | 12 | 46 | 11 | **49** |
| Perplexity (sonar-pro) | 12 | 83 | 47 | **60** |
| Gemini (gemini-2.0-flash) | 0 | 0 | 0 | **0** (failed) |

**Key observations:**
- **Perplexity** returned the most mentions (83) and identified the most unique firms (47). This makes sense — Perplexity's sonar-pro model performs web searches and surfaces more detailed, citation-backed answers.
- **ChatGPT** returned fewer but more focused mentions (46 across 11 firms). GPT-4o tends to recommend a smaller set of well-known firms.
- **Gemini** failed on every request (see Errors section below).

---

## Competitor Rankings

These are the firms AI search engines recommend most often for personal injury queries in Dallas:

| Rank | Firm | Score | vs. Mullen & Mullen |
|------|------|-------|---------------------|
| 1 | Witherite Law Group | 51 | +14 ahead |
| 2 | Jim Adler & Associates | 51 | +14 ahead |
| 3 | Anderson Injury Lawyers | 51 | +14 ahead |
| 4 | Grossman Law Offices | 48 | +11 ahead |
| 5 | Rasansky Law Firm | 33 | -4 behind |
| **6** | **Mullen & Mullen Law Firm** | **37** | — |
| 7 | Guajardo & Marks | 32 | -5 behind |
| 8 | The Girards Law Firm | 26 | -11 behind |
| 9 | Lyons & Simmons | 25 | -12 behind |
| 10 | Simon Greenstone Panatier | 24 | -13 behind |

Mullen & Mullen sits in the middle of the pack — behind the top 4 firms but ahead of several others.

---

## Run Statistics

| Metric | Value |
|--------|-------|
| Prompts sent | 36 (12 prompts x 3 platforms, but Gemini failed) |
| Responses received | 24 (12 ChatGPT + 12 Perplexity) |
| Mentions extracted | 129 |
| Review items created | 71 |
| Errors | 12 (all Gemini) |
| Email report | Skipped (RESEND_API_KEY not configured) |

---

## Errors

All 12 errors were from **Gemini**, which returned `429 RESOURCE_EXHAUSTED` on every request. The Google AI Studio API key is on the **free tier**, which has a quota limit of 0 requests for `gemini-2.0-flash`.

**Fix:** Enable billing in Google Cloud Console or Google AI Studio to get a paid tier with usable quotas. The pipeline handles Gemini failures gracefully — it logs the error and continues with the other providers.

---

## Review Queue

71 entity mentions were flagged for human review. These are cases where the fuzzy matching algorithm found a potential match (confidence 65–84%) but wasn't confident enough to auto-accept. These can be reviewed in the admin dashboard at `/admin/review`.

---

## What This Means

1. **The pipeline works end-to-end.** Data flows from AI APIs → extraction → resolution → scoring → database storage.
2. **Two out of three providers are operational.** ChatGPT and Perplexity produce useful data. Gemini needs billing enabled.
3. **The score is actionable.** A score of 37 with clear competitor rankings gives the client concrete context about their AI search visibility.
4. **The review queue needs attention.** 71 items flagged for review suggests the firm registry may need more aliases added to improve auto-matching rates.
