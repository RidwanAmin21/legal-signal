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


# ── Edge cases ───────────────────────────────────────────────────────────────

def test_empty_registry():
    result = resolve_mention("Some Firm", [], "dallas_pi")
    assert result["needs_review"] is True
    assert result["canonical_name"] is None


def test_registry_entry_missing_aliases():
    """Should not crash when a registry entry has no 'aliases' key."""
    registry = [{
        "canonical_name": "Solo Firm",
        "market": "dallas_pi",
        "is_active": True,
        # No "aliases" key
    }]
    result = resolve_mention("Solo Firm", registry, "dallas_pi")
    assert result["canonical_name"] == "Solo Firm"
    assert result["needs_review"] is False


def test_special_characters_in_name():
    """Should not crash on apostrophes and special chars."""
    result = resolve_mention("O'Brien & Associates", MOCK_REGISTRY, "dallas_pi")
    assert isinstance(result["needs_review"], bool)
    assert isinstance(result["confidence"], float)


def test_unicode_firm_name():
    """Should not crash on Unicode characters."""
    result = resolve_mention("García & López Abogados", MOCK_REGISTRY, "dallas_pi")
    assert isinstance(result["confidence"], float)
    assert isinstance(result["needs_review"], bool)


def test_empty_string_input():
    result = resolve_mention("", MOCK_REGISTRY, "dallas_pi")
    assert result["canonical_name"] is None or result["needs_review"] is True


def test_very_long_firm_name():
    """Should not crash on extremely long input strings."""
    long_name = "A" * 500 + " Law Firm"
    result = resolve_mention(long_name, MOCK_REGISTRY, "dallas_pi")
    assert isinstance(result["needs_review"], bool)


def test_inactive_firm_not_matched():
    """Inactive registry entries should be skipped."""
    registry = [{
        "canonical_name": "Inactive Firm",
        "aliases": ["Inactive"],
        "normalized_name": "inactive firm",
        "market": "dallas_pi",
        "is_active": False,
    }]
    result = resolve_mention("Inactive Firm", registry, "dallas_pi")
    assert result["canonical_name"] is None or result["needs_review"] is True
