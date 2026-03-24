"""Visibility score computation from resolved mention data."""
from config.constants import (
    MENTION_WEIGHT, POSITION_WEIGHT, SENTIMENT_WEIGHT,
    COMPOSITE_MENTION_WEIGHT, COMPOSITE_SOURCE_WEIGHT, COMPOSITE_SITE_WEIGHT,
    SITE_READINESS_DEFAULT,
)
from scoring.source_signal import compute_source_score


def compute_visibility_score(
    mentions: list[dict],
    total_prompts: int,
    platform: str | None = None,
    perplexity_responses: list[dict] | None = None,
    client: dict | None = None,
    registry: list[dict] | None = None,
) -> dict:
    """Compute visibility score from resolved mention data.

    When perplexity_responses, client, and registry are all provided (and platform
    is None, meaning this is the overall score), uses the composite formula:

        overall = mention_signal × 50% + source_signal × 40% + site_readiness × 10%

    Falls back to the original mention-only formula if no Perplexity citation data
    is available, or when computing a per-platform sub-score.

    Args:
        mentions:              Resolved mention dicts (canonical_name, position, sentiment,
                               prompt_id, platform).
        total_prompts:         Total prompts sent for this scope (platform or all).
        platform:              If set, filter mentions to this platform only.
        perplexity_responses:  monitoring_responses rows for platform='perplexity'
                               (each with a 'citations' field). Pass None to use
                               the legacy formula.
        client:                Client record dict (needs 'primary_domain').
        registry:              firm_registry rows for this market.

    Returns:
        Dict with overall_score, mention_rate, first_position_rate,
        positive_sentiment_rate, and score_components.
    """
    if platform:
        mentions = [m for m in mentions if m.get("platform") == platform]

    if total_prompts == 0:
        return _empty_score()

    # ── Mention signal components ─────────────────────────────────────────────
    mentioned_prompts: set = set()
    first_position_prompts: set[tuple] = set()
    total_mentions = len(mentions)

    for m in mentions:
        mentioned_prompts.add(m.get("prompt_id"))
        if m.get("position") == 1:
            first_position_prompts.add((m.get("prompt_id"), m.get("platform")))

    mention_rate = len(mentioned_prompts) / total_prompts
    first_position_rate = (
        len(first_position_prompts) / total_mentions if total_mentions > 0 else 0.0
    )

    known_sentiment_mentions = [m for m in mentions if m.get("sentiment") != "unknown"]
    if known_sentiment_mentions:
        known_positive = sum(1 for m in known_sentiment_mentions if m.get("sentiment") == "positive")
        positive_sentiment_rate = known_positive / len(known_sentiment_mentions)
    elif total_mentions > 0:
        positive_sentiment_rate = 0.5  # regex fallback — treat as neutral
    else:
        positive_sentiment_rate = 0.0

    mention_signal = int(
        (mention_rate * MENTION_WEIGHT)
        + (first_position_rate * POSITION_WEIGHT)
        + (positive_sentiment_rate * SENTIMENT_WEIGHT)
    )
    mention_signal = max(0, min(100, mention_signal))

    mention_components = {
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
    }

    # ── Composite scoring (overall score only, when citation data available) ──
    use_composite = (
        platform is None
        and perplexity_responses is not None
        and client is not None
        and registry is not None
    )

    if use_composite:
        source_result = compute_source_score(
            perplexity_responses,
            client.get("primary_domain"),
            registry,
        )

        if source_result["source_score"] is not None:
            source_signal = source_result["source_score"]
            site_readiness = SITE_READINESS_DEFAULT

            overall = int(
                mention_signal * (COMPOSITE_MENTION_WEIGHT / 100)
                + source_signal * (COMPOSITE_SOURCE_WEIGHT / 100)
                + site_readiness * (COMPOSITE_SITE_WEIGHT / 100)
            )
            overall = max(0, min(100, overall))

            score_components = {
                **mention_components,
                "source_signal": {
                    "raw": source_signal,
                    "weight": COMPOSITE_SOURCE_WEIGHT,
                    "contribution": round(source_signal * (COMPOSITE_SOURCE_WEIGHT / 100), 2),
                    "breakdown": source_result["components"],
                    "total_citations": source_result["total_citations"],
                    "unique_domains": source_result["unique_domains"],
                },
                "site_readiness": {
                    "raw": site_readiness,
                    "weight": COMPOSITE_SITE_WEIGHT,
                    "contribution": round(site_readiness * (COMPOSITE_SITE_WEIGHT / 100), 2),
                    "note": "hardcoded pending site-audit module",
                },
                "formula": "composite",
                "mention_signal_subtotal": mention_signal,
            }

            return {
                "overall_score": overall,
                "mention_rate": round(mention_rate, 4),
                "first_position_rate": round(first_position_rate, 4),
                "positive_sentiment_rate": round(positive_sentiment_rate, 4),
                "score_components": score_components,
            }

    # ── Legacy formula fallback ───────────────────────────────────────────────
    return {
        "overall_score": mention_signal,
        "mention_rate": round(mention_rate, 4),
        "first_position_rate": round(first_position_rate, 4),
        "positive_sentiment_rate": round(positive_sentiment_rate, 4),
        "score_components": {
            **mention_components,
            "formula": "legacy",
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
