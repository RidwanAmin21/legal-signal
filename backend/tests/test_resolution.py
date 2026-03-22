"""Tests for the resolution module."""
from resolution.matcher import resolve_mention
from resolution.normalizer import normalize_firm_name

MOCK_REGISTRY = [
    {
        "canonical_name": "Mullen & Mullen Law Firm",
        "aliases": ["Mullen & Mullen", "Shane Mullen"],
        "normalized_name": "mullen mullen",
        "domain": "mullenandmullen.com",
        "market": "dallas_pi",
        "is_active": True,
    },
    {
        "canonical_name": "Angel Reyes & Associates",
        "aliases": ["Angel Reyes", "Reyes & Associates"],
        "normalized_name": "angel reyes",
        "domain": "angelreyeslaw.com",
        "market": "dallas_pi",
        "is_active": True,
    },
]


def test_exact_alias_match():
    result = resolve_mention("Mullen & Mullen", MOCK_REGISTRY, "dallas_pi")
    assert result["canonical_name"] == "Mullen & Mullen Law Firm"
    assert result["confidence"] == 1.0
    assert result["needs_review"] is False


def test_fuzzy_match_auto_accept():
    # "Mullen Mullen Law Firm" normalizes to "mullen mullen" — matches registry
    result = resolve_mention("Mullen Mullen Law Firm", MOCK_REGISTRY, "dallas_pi")
    assert result["canonical_name"] == "Mullen & Mullen Law Firm"
    assert result["confidence"] >= 0.85
    assert result["needs_review"] is False


def test_unknown_firm_flagged():
    result = resolve_mention("Totally Unknown Law Office", MOCK_REGISTRY, "dallas_pi")
    assert result["needs_review"] is True


def test_wrong_market_no_match():
    result = resolve_mention("Angel Reyes", MOCK_REGISTRY, "houston_pi")
    assert result["canonical_name"] is None or result["needs_review"] is True


def test_normalize_firm_name():
    assert normalize_firm_name("Mullen & Mullen Law Firm") == "mullen & mullen"
    assert normalize_firm_name("  Angel   Reyes  ") == "angel reyes"
    assert normalize_firm_name("") == ""
