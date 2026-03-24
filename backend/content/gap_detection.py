"""Gap detection — zero API calls.

Analyses monitoring data already collected in the current run to surface:

  1. Mention gaps  — prompts where the client was not mentioned on one or
                     more platforms. Ranked by how many competitors *were*
                     mentioned (strong signal that AI already answers this
                     query, just not with the client).

  2. Citation gaps — Perplexity responses where no firm website was cited
                     at all. Any firm can fill the gap by publishing a
                     well-structured article on that topic.

Returns a ranked list of gap dicts, highest opportunity_score first.
"""
from __future__ import annotations
from collections import defaultdict

from scoring.source_signal import categorize_url


# ── Opportunity scoring ───────────────────────────────────────────────────────

def _mention_opportunity_score(competitor_count: int, platforms_missing: int,
                                total_platforms: int) -> int:
    """Score 0-100 for mention gaps.

    High scores go to prompts where several competitors appear (proving AI
    answers this query) but the client does not. Low scores go to prompts
    where nobody appears (AI may be avoiding the topic).
    """
    if competitor_count == 0:
        base = 25       # AI may not engage with this query type
    elif competitor_count == 1:
        base = 55
    elif competitor_count == 2:
        base = 75
    else:               # 3+
        base = 90

    # Scale down if the gap is only on a subset of platforms
    platform_ratio = platforms_missing / max(total_platforms, 1)
    return min(100, int(base * (0.6 + 0.4 * platform_ratio)))


def _citation_opportunity_score(categories_present: set[str]) -> int:
    """Score 0-100 for citation gaps.

    If Perplexity is already citing authoritative sources (directories,
    editorial) but no firm websites, there is a clear content gap.
    """
    authoritative = {"directory", "editorial", "legal_resource"}
    present_auth = len(authoritative & categories_present)
    if present_auth >= 2:
        return 72
    elif present_auth == 1:
        return 52
    else:
        return 35


# ── Topic suggestion ──────────────────────────────────────────────────────────

_STRIP_LEADING = {"best", "top", "find", "get", "hire"}
_STRIP_TRAILING = {"lawyer", "lawyers", "attorney", "attorneys", "firm", "law firm"}


def _suggest_topic(prompt_text: str) -> str:
    """Convert a search prompt into a suggested article title."""
    words = prompt_text.strip().split()
    if not words:
        return prompt_text.title()

    # Strip leading qualifiers ("best", "top")
    if words[0].lower() in _STRIP_LEADING:
        words = words[1:]

    # Strip trailing role words ("lawyer", "attorney")
    while words and words[-1].lower() in _STRIP_TRAILING:
        words = words[:-1]

    if not words:
        return prompt_text.title()

    base = " ".join(words).title()

    lower = prompt_text.lower()
    if lower.startswith(("how ", "what ", "when ", "why ", "do ", "can ", "should ")):
        return base + "?"
    elif lower.startswith(("best ", "top ")):
        return base + ": What You Need to Know"
    else:
        return base + ": A Complete Guide"


# ── Main function ─────────────────────────────────────────────────────────────

def detect_gaps(
    responses: list[dict],
    prompts: list[dict],
    client_firm: str,
    registry: list[dict],
) -> list[dict]:
    """Detect content gaps from already-collected monitoring data.

    Args:
        responses: monitoring_responses rows (platform, prompt_id,
                   firms_mentioned, citations).
        prompts:   prompts rows (id, text) for this run's metro/practice area.
        client_firm: canonical firm name for this client.
        registry:  firm_registry rows (domain, canonical_name) for this market.

    Returns:
        List of gap dicts sorted by opportunity_score descending.
        Makes zero external API calls.
    """
    # Build lookup maps
    prompt_map: dict[str, str] = {str(p["id"]): p["text"] for p in prompts}

    registry_domains: frozenset[str] = frozenset(
        r["domain"].lower().lstrip("www.") for r in registry if r.get("domain")
    )

    client_lower = client_firm.lower()
    gaps: list[dict] = []
    seen_citation_prompts: set[str] = set()  # deduplicate citation gaps

    # ── Group responses by prompt ─────────────────────────────────────────────
    by_prompt: dict[str, list[dict]] = defaultdict(list)
    for resp in responses:
        by_prompt[str(resp["prompt_id"])].append(resp)

    # ── Mention gaps ──────────────────────────────────────────────────────────
    for prompt_id, prompt_responses in by_prompt.items():
        prompt_text = prompt_map.get(prompt_id, "")
        all_platforms = {r["platform"] for r in prompt_responses}

        platforms_with_client: set[str] = set()
        all_competitors: set[str] = set()

        for resp in prompt_responses:
            platform = resp["platform"]
            for mention in resp.get("firms_mentioned") or []:
                canonical = mention.get("canonical_name")
                if not canonical:
                    continue
                if canonical.lower() == client_lower:
                    platforms_with_client.add(platform)
                else:
                    all_competitors.add(canonical)

        platforms_missing = all_platforms - platforms_with_client
        if not platforms_missing:
            continue  # client mentioned everywhere — no gap

        gaps.append({
            "prompt_id": prompt_id,
            "prompt_text": prompt_text,
            "gap_type": "mention_gap",
            "platforms_missing": sorted(platforms_missing),
            "competitors_present": sorted(all_competitors),
            "competitor_count": len(all_competitors),
            "citation_categories_present": [],
            "citation_categories_missing": [],
            "opportunity_score": _mention_opportunity_score(
                len(all_competitors), len(platforms_missing), len(all_platforms)
            ),
            "suggested_topic": _suggest_topic(prompt_text),
        })

    # ── Citation gaps (Perplexity only) ───────────────────────────────────────
    for resp in responses:
        if resp["platform"] != "perplexity":
            continue

        prompt_id = str(resp["prompt_id"])
        if prompt_id in seen_citation_prompts:
            continue

        citations = resp.get("citations") or []
        if not citations:
            continue

        cats_present: set[str] = set()
        has_firm_website = False

        for cite in citations:
            url = cite.get("url", "")
            if not url:
                continue
            cat = categorize_url(url, registry_domains)
            cats_present.add(cat)
            if cat == "firm_website":
                has_firm_website = True

        meaningful = cats_present - {"other"}
        if has_firm_website or not meaningful:
            continue  # firm already cited, or no useful sources at all

        seen_citation_prompts.add(prompt_id)
        prompt_text = prompt_map.get(prompt_id, "")

        gaps.append({
            "prompt_id": prompt_id,
            "prompt_text": prompt_text,
            "gap_type": "citation_gap",
            "platforms_missing": ["perplexity"],
            "competitors_present": [],
            "competitor_count": 0,
            "citation_categories_present": sorted(meaningful),
            "citation_categories_missing": ["firm_website"],
            "opportunity_score": _citation_opportunity_score(meaningful),
            "suggested_topic": _suggest_topic(prompt_text),
        })

    gaps.sort(key=lambda g: g["opportunity_score"], reverse=True)
    return gaps
