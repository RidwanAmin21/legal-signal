"""Citation matcher — string comparison only, zero API calls.

Runs on every weekly pipeline execution. Checks whether any of the client's
published article URLs appear in this week's Perplexity citation arrays.

Matching uses domain + path comparison after normalising both sides
(lowercase, strip query params, strip fragments, strip trailing slash).
This means query-string variants and UTM-tagged URLs still match the
canonical published URL.

When a new citation is found (first_cited_at was null), the content_drafts
row is updated and a content_alert record is created.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)


# ── URL normalisation ─────────────────────────────────────────────────────────

def _normalize_url(url: str) -> str:
    """Return scheme + netloc + path, lowercased, trailing slash stripped.

    Query strings, fragments, and authentication components are dropped so
    that `https://firm.com/blog/post?utm_source=google#top` and
    `https://firm.com/blog/post` are treated as identical.
    """
    try:
        p = urlparse(url.strip().lower())
        canonical = urlunparse((p.scheme, p.netloc, p.path.rstrip("/"), "", "", ""))
        return canonical
    except Exception:
        return url.strip().lower()


# ── Main function ─────────────────────────────────────────────────────────────

def match_citations(
    published_drafts: list[dict],
    perplexity_responses: list[dict],
    db,
    client_id: str,
) -> dict:
    """Check published URLs against this week's Perplexity citation arrays.

    Args:
        published_drafts:      content_drafts rows where status='published'
                               and published_url is not null. Each row must
                               have: id, published_url, first_cited_at.
        perplexity_responses:  monitoring_responses rows for platform='perplexity'.
                               Each must have: prompt_id, citations (list of
                               {"url": ...}).
        db:                    Supabase client (service-role).
        client_id:             UUID string for alert records.

    Returns:
        Dict: urls_checked, citations_found (list), new_citations (int),
        alerts_created (int). All JSON-serialisable.
    """
    if not published_drafts:
        return {
            "urls_checked": 0,
            "citations_found": [],
            "new_citations": 0,
            "alerts_created": 0,
        }

    # Build index: normalised cited URL → list of {prompt_id, response_id}
    cited_index: dict[str, list[dict]] = {}
    for resp in perplexity_responses:
        for cite in resp.get("citations") or []:
            url = cite.get("url", "")
            if not url:
                continue
            norm = _normalize_url(url)
            if norm not in cited_index:
                cited_index[norm] = []
            cited_index[norm].append({
                "prompt_id":   str(resp.get("prompt_id", "")),
                "response_id": str(resp.get("id", "")),
                "platform":    "perplexity",
            })

    citations_found: list[dict] = []
    new_citations = 0
    alerts_created = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for draft in published_drafts:
        published_url = draft.get("published_url") or ""
        if not published_url:
            continue

        norm_published = _normalize_url(published_url)
        if norm_published not in cited_index:
            continue

        matches = cited_index[norm_published]
        is_new  = draft.get("first_cited_at") is None

        for match in matches:
            citations_found.append({
                "published_url":  published_url,
                "cited_in_prompt": match["prompt_id"],
                "platform":        match["platform"],
            })

        if is_new:
            try:
                db.table("content_drafts").update({
                    "first_cited_at": now_iso,
                    "status":         "cited",
                }).eq("id", draft["id"]).execute()

                db.table("content_alerts").insert({
                    "client_id":  client_id,
                    "draft_id":   draft["id"],
                    "alert_type": "first_citation",
                    "payload": {
                        "published_url": published_url,
                        "citations":     matches,
                        "cited_at":      now_iso,
                    },
                }).execute()

                new_citations  += 1
                alerts_created += 1
                logger.info("New citation: %s", published_url)

            except Exception as e:
                logger.error(
                    "Failed to record citation for draft %s: %s",
                    draft.get("id"), e, exc_info=True,
                )

    return {
        "urls_checked":    len(published_drafts),
        "citations_found": citations_found,
        "new_citations":   new_citations,
        "alerts_created":  alerts_created,
    }
