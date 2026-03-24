"""Perplexity citation source signal computation.

Analyses the citation URLs Perplexity returns to produce a source_score (0-100)
built from four sub-components:

  1. Client domain presence   (40 pts) — is the client's own site being cited, and how often?
  2. Directory presence       (25 pts) — do high-authority legal directories appear in citations?
  3. Competitor domain gap    (20 pts) — are competitors cited more than the client?
  4. Source diversity         (15 pts) — how many distinct domains appear across all citations?
"""
from __future__ import annotations
from collections import Counter
from urllib.parse import urlparse
from config.constants import (
    DIRECTORY_DOMAINS as _DIRECTORY_DOMAINS,
    LEGAL_RESOURCE_DOMAINS as _LEGAL_RESOURCE_DOMAINS,
    EDITORIAL_DOMAINS as _EDITORIAL_DOMAINS,
    REVIEW_DOMAINS as _REVIEW_DOMAINS,
)

# ── Source category definitions (frozensets for O(1) lookup) ─────────────────

DIRECTORY_DOMAINS: frozenset[str]       = frozenset(_DIRECTORY_DOMAINS)
LEGAL_RESOURCE_DOMAINS: frozenset[str]  = frozenset(_LEGAL_RESOURCE_DOMAINS)
EDITORIAL_DOMAINS: frozenset[str]       = frozenset(_EDITORIAL_DOMAINS)
REVIEW_PLATFORM_DOMAINS: frozenset[str] = frozenset(_REVIEW_DOMAINS)

# Union of all domains whose category is statically known — used for subdomain normalization
_ALL_CATEGORIZED: frozenset[str] = (
    DIRECTORY_DOMAINS | LEGAL_RESOURCE_DOMAINS | EDITORIAL_DOMAINS | REVIEW_PLATFORM_DOMAINS
)

# 15 unique domains across all citations = "good" for diversity scoring
_DIVERSITY_BASELINE = 15


def _root_domain(url: str) -> str:
    """Return the netloc of a URL with www. stripped, or '' on failure."""
    try:
        if "://" not in url:
            url = "https://" + url
        host = urlparse(url).netloc.lower()
        return host.removeprefix("www.")
    except Exception:
        return ""


def _normalize_domain(domain: str) -> str:
    """Resolve a subdomain to its known root domain, if any.

    Examples:
        profiles.martindale.com  → martindale.com
        www.avvo.com             → avvo.com  (www already stripped by _root_domain)
        news.justia.com          → justia.com
        mullenandmullen.com      → mullenandmullen.com  (not in known list; unchanged)
    """
    if domain in _ALL_CATEGORIZED:
        return domain
    parts = domain.split(".")
    for i in range(1, len(parts) - 1):
        parent = ".".join(parts[i:])
        if parent in _ALL_CATEGORIZED:
            return parent
    return domain


def categorize_url(url: str, registry_domains: frozenset[str]) -> str:
    """Classify a URL into one of six categories."""
    domain = _root_domain(url)
    if not domain:
        return "other"
    if domain in DIRECTORY_DOMAINS:
        return "directory"
    if domain in EDITORIAL_DOMAINS:
        return "editorial"
    if domain in LEGAL_RESOURCE_DOMAINS:
        return "legal_resource"
    if domain in REVIEW_PLATFORM_DOMAINS:
        return "review_platform"
    if domain in registry_domains:
        return "firm_website"
    return "other"


# ── Main scoring function ────────────────────────────────────────────────────

def compute_source_score(
    perplexity_responses: list[dict],
    client_domain: str | None,
    registry: list[dict],
) -> dict:
    """Compute source signal score from Perplexity citation URLs.

    Args:
        perplexity_responses: monitoring_responses rows where platform='perplexity',
                              each with a 'citations' field ([{"url": ..., ...}]).
        client_domain:        The client's primary domain (e.g. 'mullenandmullen.com').
        registry:             firm_registry rows for this market (each has 'domain', 'canonical_name').

    Returns:
        Rich dict with source_score (int 0-100, or None if no citations), sub_scores breakdown,
        recommendations, top_sources, missing_directories, and citation metadata.
    """
    # Build registry domain set (all known firm domains in this market)
    registry_domains: frozenset[str] = frozenset(
        _root_domain(r["domain"])
        for r in registry
        if r.get("domain")
    )

    client_domain_norm = _root_domain(client_domain) if client_domain else None

    # ── Collect citations ────────────────────────────────────────────────────
    # Track domains per response (for tiered client-presence scoring) and totals
    per_response_domains: list[set[str]] = []
    domain_counts: Counter = Counter()

    for resp in perplexity_responses:
        resp_domains: set[str] = set()
        for cite in resp.get("citations") or []:
            url = cite.get("url", "")
            if url:
                d = _root_domain(url)
                if d:
                    d = _normalize_domain(d)  # profiles.martindale.com → martindale.com
                    resp_domains.add(d)
                    domain_counts[d] += 1
        per_response_domains.append(resp_domains)

    if not domain_counts:
        return _empty_source_score()

    unique_domains: set[str] = set(domain_counts.keys())
    total_citations = sum(domain_counts.values())
    n_responses = len(perplexity_responses)

    # Categorise every unique domain once
    domain_categories: dict[str, str] = {
        d: categorize_url(f"https://{d}", registry_domains)
        for d in unique_domains
    }

    firm_website_domains = {d for d, c in domain_categories.items() if c == "firm_website"}
    competitor_domains_cited = {d for d in firm_website_domains if d != client_domain_norm}
    directories_found = {d for d, c in domain_categories.items() if c == "directory"}

    # ── Component 1: Client domain presence (40 pts) ──────────────────────────
    client_response_count = sum(
        1 for rds in per_response_domains
        if client_domain_norm and client_domain_norm in rds
    )
    client_domain_cited = client_response_count > 0

    if client_response_count >= 3:
        client_presence_raw = 100
        client_reason = f"Your site appeared in {client_response_count} of {n_responses} Perplexity responses"
    elif client_response_count == 2:
        client_presence_raw = 75
        client_reason = f"Your site appeared in 2 of {n_responses} Perplexity responses"
    elif client_response_count == 1:
        client_presence_raw = 50
        client_reason = f"Your site appeared in only 1 of {n_responses} Perplexity responses"
    else:
        client_presence_raw = 0
        client_reason = "Your site was not cited in any Perplexity response"

    client_presence_weighted = round(client_presence_raw * 0.40, 2)

    # ── Component 2: Directory presence (25 pts) ──────────────────────────────
    directory_presence_raw = round(len(directories_found) / len(DIRECTORY_DOMAINS) * 100, 2)
    directory_presence_weighted = round(directory_presence_raw * 0.25, 2)
    missing_directories = sorted(DIRECTORY_DOMAINS - directories_found)

    if directories_found:
        directory_reason = (
            f"{len(directories_found)} of {len(DIRECTORY_DOMAINS)} major directories cited: "
            f"{', '.join(sorted(directories_found))}"
        )
    else:
        directory_reason = "No major legal directories appeared in Perplexity citations"

    # ── Component 3: Competitor domain gap (20 pts) ───────────────────────────
    competitor_response_counts: dict[str, int] = {
        d: sum(1 for rds in per_response_domains if d in rds)
        for d in competitor_domains_cited
    }

    if not firm_website_domains:
        competitor_gap_raw = 50
        competitor_gap_reason = "No firm websites (yours or competitors') were cited"
    elif not competitor_domains_cited:
        competitor_gap_raw = 100
        competitor_gap_reason = "Your site is the only firm website being cited"
    else:
        avg_competitor_responses = (
            sum(competitor_response_counts.values()) / len(competitor_response_counts)
        )
        if avg_competitor_responses == 0:
            competitor_gap_raw = 100
            competitor_gap_reason = "Competitor sites cited but no more frequently than yours"
        else:
            ratio = client_response_count / avg_competitor_responses
            competitor_gap_raw = min(100, int(ratio * 100))
            competitor_gap_reason = (
                f"Your site cited in {client_response_count} responses vs "
                f"avg {avg_competitor_responses:.1f} for "
                f"{len(competitor_domains_cited)} competitor(s)"
            )

    competitor_gap_weighted = round(competitor_gap_raw * 0.20, 2)

    # ── Component 4: Source diversity (15 pts) ────────────────────────────────
    diversity_raw = min(100, round(len(unique_domains) / _DIVERSITY_BASELINE * 100, 2))
    diversity_weighted = round(diversity_raw * 0.15, 2)
    diversity_reason = (
        f"{len(unique_domains)} unique domains cited "
        f"(baseline for full score: {_DIVERSITY_BASELINE})"
    )

    # ── Total ─────────────────────────────────────────────────────────────────
    total = int(
        client_presence_weighted
        + directory_presence_weighted
        + competitor_gap_weighted
        + diversity_weighted
    )
    total = max(0, min(100, total))

    # ── Top sources ───────────────────────────────────────────────────────────
    # Override category to "firm_website" for the client's own domain even if it's
    # not in the registry (registry only contains competitor firms in this market).
    top_sources = [
        {
            "domain": d,
            "category": "firm_website" if d == client_domain_norm else domain_categories[d],
            "count": cnt,
        }
        for d, cnt in domain_counts.most_common(20)
    ]

    # ── Recommendations ───────────────────────────────────────────────────────
    recommendations: list[str] = []

    if not client_domain_cited:
        recommendations.append(
            "Your website was never cited as a source by Perplexity. "
            "Publishing authoritative, structured content (FAQs, practice-area guides) "
            "increases the chance of being cited in AI-generated answers."
        )
    elif client_response_count < 3:
        recommendations.append(
            f"Your site was cited in only {client_response_count} of {n_responses} "
            "Perplexity responses. Expand your content coverage to appear more consistently."
        )

    if missing_directories:
        recommendations.append(
            f"Perplexity didn't cite your presence on: {', '.join(missing_directories)}. "
            "Ensure your profiles on these directories are complete and up to date — "
            "AI engines treat them as authoritative sources for law firm discovery."
        )

    if competitor_domains_cited and not client_domain_cited:
        recommendations.append(
            f"{len(competitor_domains_cited)} competitor firm(s) are being cited as sources "
            f"in queries where your site isn't. "
            f"Competing domains: {', '.join(sorted(competitor_domains_cited))}."
        )
    elif competitor_domains_cited and competitor_gap_raw < 60:
        recommendations.append(
            "Competitors are cited significantly more often than your firm. "
            "Focus on building domain authority and earning citations on AI-trusted sources."
        )

    if diversity_raw < 50:
        recommendations.append(
            f"Only {len(unique_domains)} unique domains were cited across all queries. "
            "A broader backlink and citation footprint helps AI engines trust your firm's authority."
        )

    return {
        "source_score": total,
        "client_domain_cited": client_domain_cited,
        "client_citation_count": client_response_count,
        "competitor_domains_cited": sorted(competitor_domains_cited),
        "top_sources": top_sources,
        "missing_directories": missing_directories,
        "recommendations": recommendations,
        "sub_scores": {
            "client_presence": {
                "raw": client_presence_raw,
                "weighted": client_presence_weighted,
                "reason": client_reason,
            },
            "directory_presence": {
                "raw": directory_presence_raw,
                "weighted": directory_presence_weighted,
                "reason": directory_reason,
            },
            "competitor_gap": {
                "raw": competitor_gap_raw,
                "weighted": competitor_gap_weighted,
                "reason": competitor_gap_reason,
            },
            "source_diversity": {
                "raw": diversity_raw,
                "weighted": diversity_weighted,
                "reason": diversity_reason,
            },
        },
        "total_citations": total_citations,
        "unique_domains": len(unique_domains),
    }


def _empty_source_score() -> dict:
    """Returned when perplexity_responses is empty or contains no citation URLs.

    Returns source_score=0 (not None) so the composite formula still runs and
    awards 0 points for source signal rather than falling back to the legacy formula.
    All directories are listed as missing because none were cited.
    """
    return {
        "source_score": 0,
        "client_domain_cited": False,
        "client_citation_count": 0,
        "competitor_domains_cited": [],
        "top_sources": [],
        "missing_directories": sorted(DIRECTORY_DOMAINS),
        "recommendations": [
            "No Perplexity citation data was found for this run. "
            "Ensure Perplexity responses are being collected with citation URLs."
        ],
        "sub_scores": {},
        "total_citations": 0,
        "unique_domains": 0,
    }
