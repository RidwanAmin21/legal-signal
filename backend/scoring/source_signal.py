"""Perplexity citation source signal computation.

Analyses the citation URLs Perplexity returns to produce a source_score (0-100)
built from four sub-components:

  1. Client domain presence      (40 pts) — is the client's own site being cited?
  2. Directory authority         (30 pts) — do high-authority legal directories appear?
  3. Competitor-source absence   (20 pts) — are competitors getting cited on sources the client isn't?
  4. Source diversity            (10 pts) — how many distinct source categories appear?
"""
from urllib.parse import urlparse

# ── Source category definitions ─────────────────────────────────────────────

DIRECTORY_DOMAINS: frozenset[str] = frozenset({
    "avvo.com",
    "justia.com",
    "superlawyers.com",
    "martindale.com",
    "lawyers.com",
})

EDITORIAL_DOMAINS: frozenset[str] = frozenset({
    "forbes.com",
    "usnews.com",
})

LEGAL_RESOURCE_DOMAINS: frozenset[str] = frozenset({
    "eloa.org",
    "topverdict.com",
    "ontoplist.com",
})

_ALL_KNOWN = DIRECTORY_DOMAINS | EDITORIAL_DOMAINS | LEGAL_RESOURCE_DOMAINS


def _root_domain(url: str) -> str:
    """Return the root domain of a URL or bare domain string, stripping www."""
    try:
        if "://" not in url:
            url = "https://" + url
        host = urlparse(url).netloc.lower()
        return host.removeprefix("www.")
    except Exception:
        return ""


def categorize_url(url: str, registry_domains: frozenset[str]) -> str:
    """Classify a URL into one of five categories."""
    domain = _root_domain(url)
    if not domain:
        return "other"
    if domain in DIRECTORY_DOMAINS:
        return "directory"
    if domain in EDITORIAL_DOMAINS:
        return "editorial"
    if domain in LEGAL_RESOURCE_DOMAINS:
        return "legal_resource"
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
                              each with a 'citations' field ([{"url": ..., "position": ...}]).
        client_domain:        The client's primary domain (e.g. 'mullenandmullen.com').
        registry:             firm_registry rows for this market (each has 'domain', 'canonical_name').

    Returns:
        Dict with 'source_score' (int 0-100, or None if no citations) and 'components' breakdown.
    """
    # Build registry domain set (all known firm domains in this market)
    registry_domains: frozenset[str] = frozenset(
        _root_domain(r["domain"])
        for r in registry
        if r.get("domain")
    )

    # Normalise client domain
    client_domain_norm = _root_domain(client_domain) if client_domain else None

    # Collect every cited URL from all Perplexity responses
    all_urls: list[str] = []
    for resp in perplexity_responses:
        for cite in resp.get("citations") or []:
            url = cite.get("url", "")
            if url:
                all_urls.append(url)

    if not all_urls:
        return _empty_source_score()

    unique_domains: set[str] = {_root_domain(u) for u in all_urls if _root_domain(u)}

    # Categorise every unique domain
    categories_present: set[str] = set()
    directory_domains_found: set[str] = set()
    firm_website_domains: set[str] = set()

    for domain in unique_domains:
        cat = categorize_url(f"https://{domain}", registry_domains)
        categories_present.add(cat)
        if cat == "directory":
            directory_domains_found.add(domain)
        if cat == "firm_website":
            firm_website_domains.add(domain)

    # ── Component 1: Client domain presence (40 pts) ─────────────────────────
    client_cited = bool(client_domain_norm and client_domain_norm in unique_domains)
    client_score = 40.0 if client_cited else 0.0

    # ── Component 2: Directory authority (30 pts) ────────────────────────────
    directory_score = min(len(directory_domains_found) / len(DIRECTORY_DOMAINS), 1.0) * 30.0

    # ── Component 3: Competitor-source absence (20 pts) ──────────────────────
    # Firm websites cited that belong to competitors (not the client)
    competitor_firm_sites = {
        d for d in firm_website_domains
        if d != client_domain_norm
    }

    if not firm_website_domains:
        # No firm websites cited at all — neutral
        competitor_absence_score = 10.0
        competitor_only_rate = 0.5
    elif client_cited and not competitor_firm_sites:
        # Only the client's site is cited — best case
        competitor_absence_score = 20.0
        competitor_only_rate = 0.0
    elif not client_cited and competitor_firm_sites:
        # Only competitors' sites are cited — worst case
        competitor_absence_score = 0.0
        competitor_only_rate = 1.0
    else:
        # Mixed: scale by fraction of firm-website citations that belong to competitors
        competitor_only_rate = len(competitor_firm_sites) / len(firm_website_domains)
        competitor_absence_score = (1.0 - competitor_only_rate) * 20.0

    # ── Component 4: Source diversity (10 pts) ───────────────────────────────
    meaningful = {"directory", "editorial", "legal_resource", "firm_website"}
    diversity_score = (len(categories_present & meaningful) / len(meaningful)) * 10.0

    total = int(client_score + directory_score + competitor_absence_score + diversity_score)
    total = max(0, min(100, total))

    return {
        "source_score": total,
        "components": {
            "client_presence": {
                "raw": 1.0 if client_cited else 0.0,
                "weight": 40,
                "contribution": round(client_score, 2),
                "client_domain": client_domain_norm,
                "cited": client_cited,
            },
            "directory_authority": {
                "raw": round(len(directory_domains_found) / len(DIRECTORY_DOMAINS), 4),
                "weight": 30,
                "contribution": round(directory_score, 2),
                "directories_found": sorted(directory_domains_found),
            },
            "competitor_absence": {
                "raw": round(1.0 - competitor_only_rate, 4),
                "weight": 20,
                "contribution": round(competitor_absence_score, 2),
                "competitor_sites_cited": sorted(competitor_firm_sites),
            },
            "source_diversity": {
                "raw": round(len(categories_present & meaningful) / len(meaningful), 4),
                "weight": 10,
                "contribution": round(diversity_score, 2),
                "categories_found": sorted(categories_present & meaningful),
            },
        },
        "total_citations": len(all_urls),
        "unique_domains": len(unique_domains),
    }


def _empty_source_score() -> dict:
    return {
        "source_score": None,
        "components": {},
        "total_citations": 0,
        "unique_domains": 0,
    }
