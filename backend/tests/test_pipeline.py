"""Pipeline integration tests. Require Supabase + seeded data to run."""
import pytest

from scoring.scorer import compute_visibility_score


def test_scoring_integration_with_mentions():
    """Verify scoring produces valid output for realistic mention data."""
    mentions = [
        {"prompt_id": "p1", "position": 1, "sentiment": "positive", "platform": "chatgpt"},
        {"prompt_id": "p2", "position": 2, "sentiment": "neutral", "platform": "perplexity"},
        {"prompt_id": "p1", "position": 3, "sentiment": "positive", "platform": "gemini"},
    ]
    result = compute_visibility_score(mentions, total_prompts=10)
    assert 0 <= result["overall_score"] <= 100
    assert result["mention_rate"] == 0.2  # 2 unique prompts / 10
    assert "score_components" in result
    assert result["score_components"]["mention"]["contribution"] == 10.0  # 0.2 * 50
