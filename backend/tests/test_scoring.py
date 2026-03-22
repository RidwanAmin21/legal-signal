"""Tests for the scoring module."""
from scoring.scorer import compute_visibility_score


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
