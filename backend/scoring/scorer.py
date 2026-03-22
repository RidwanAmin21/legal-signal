"""Visibility score computation from resolved mention data."""
from config.constants import MENTION_WEIGHT, POSITION_WEIGHT, SENTIMENT_WEIGHT


def compute_visibility_score(
    mentions: list[dict],
    total_prompts: int,
    platform: str | None = None,
) -> dict:
    """Compute visibility score from resolved mention data.

    Args:
        mentions: List of mention dicts with keys: canonical_name, position, sentiment, prompt_id, platform
        total_prompts: Total number of prompts queried for this platform (or all platforms)
        platform: If set, filter mentions to this platform only

    Returns: Dict with overall_score, mention_rate, first_position_rate,
             positive_sentiment_rate, and score_components
    """
    if platform:
        mentions = [m for m in mentions if m.get("platform") == platform]

    if total_prompts == 0:
        return _empty_score()

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

    # Exclude "unknown" sentiment (regex fallback) from the sentiment calculation.
    # If all sentiments are unknown, default to 0.5 (neutral) to avoid penalizing
    # clients when GPT extraction was unavailable.
    known_sentiment_mentions = [m for m in mentions if m.get("sentiment") != "unknown"]
    if known_sentiment_mentions:
        known_positive = sum(1 for m in known_sentiment_mentions if m.get("sentiment") == "positive")
        positive_sentiment_rate = known_positive / len(known_sentiment_mentions)
    elif total_mentions > 0:
        positive_sentiment_rate = 0.5  # all mentions came from regex fallback
    else:
        positive_sentiment_rate = 0.0

    overall = int(
        (mention_rate * MENTION_WEIGHT)
        + (first_position_rate * POSITION_WEIGHT)
        + (positive_sentiment_rate * SENTIMENT_WEIGHT)
    )
    overall = max(0, min(100, overall))

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
