"""Tests for the extraction module."""
import json
from unittest.mock import MagicMock, patch

from extraction.extractor import extract_mentions
from extraction.regex_fallback import regex_extract


SAMPLE_RESPONSE = (
    "I recommend Mullen & Mullen Law Firm and The Callahan Law Firm "
    "for personal injury cases in Dallas."
)
KNOWN_FIRMS = [
    "Mullen & Mullen Law Firm",
    "The Callahan Law Firm",
    "Angel Reyes & Associates",
]


def _mock_openai_response(firms_list: list) -> MagicMock:
    """Build a mock OpenAI chat completion response."""
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = json.dumps({"firms": firms_list})
    return mock_resp


def test_extraction_returns_list():
    """Verify extraction returns a list of mention dicts (mocked OpenAI)."""
    mock_resp = _mock_openai_response([
        {"firm_name": "Mullen & Mullen Law Firm", "position": 1, "sentiment": "positive", "description": "Top rated"},
        {"firm_name": "The Callahan Law Firm", "position": 2, "sentiment": "neutral", "description": "Experienced"},
    ])

    with patch("extraction.extractor.openai.OpenAI") as mock_client_cls, \
         patch("extraction.extractor.settings") as mock_settings:
        mock_settings.openai_api_key = "sk-test-key"
        mock_client_cls.return_value.chat.completions.create.return_value = mock_resp
        result = extract_mentions(SAMPLE_RESPONSE, KNOWN_FIRMS)

    assert isinstance(result, list)
    assert len(result) >= 2
    for mention in result:
        assert "firm_name" in mention
        assert "position" in mention
        assert "sentiment" in mention


def test_extraction_handles_empty_response():
    """Verify extraction returns empty list for empty input (no API call)."""
    result = extract_mentions("", ["Some Firm"])
    assert result == []


def test_extraction_handles_none():
    """Verify extraction doesn't crash on None input (no API call)."""
    result = extract_mentions(None, ["Some Firm"])
    assert result == []


def test_extraction_parses_firms_key():
    """Verify extraction correctly unwraps the {'firms': [...]} wrapper."""
    mock_resp = _mock_openai_response([
        {"firm_name": "Test Firm", "position": 1, "sentiment": "positive", "description": "Good firm"},
    ])

    with patch("extraction.extractor.openai.OpenAI") as mock_client_cls, \
         patch("extraction.extractor.settings") as mock_settings:
        mock_settings.openai_api_key = "sk-test-key"
        mock_client_cls.return_value.chat.completions.create.return_value = mock_resp
        result = extract_mentions("Test Firm is great.", ["Test Firm"])

    assert len(result) == 1
    assert result[0]["firm_name"] == "Test Firm"


def test_extraction_falls_back_on_json_error():
    """Verify extraction falls back to regex when OpenAI returns invalid JSON."""
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = "not valid json {{{"

    with patch("extraction.extractor.openai.OpenAI") as mock_client_cls, \
         patch("extraction.extractor.settings") as mock_settings:
        mock_settings.openai_api_key = "sk-test-key"
        mock_client_cls.return_value.chat.completions.create.return_value = mock_resp
        result = extract_mentions(SAMPLE_RESPONSE, KNOWN_FIRMS)

    # Regex fallback should still find the firms
    assert isinstance(result, list)


# ── Regex fallback tests (no API key needed) ────────────────────────────────

def test_regex_fallback_finds_known_firms():
    result = regex_extract(SAMPLE_RESPONSE, KNOWN_FIRMS)
    assert len(result) == 2
    names_lower = [r["firm_name"].lower() for r in result]
    assert "mullen & mullen law firm" in names_lower
    assert "the callahan law firm" in names_lower


def test_regex_fallback_returns_unknown_sentiment():
    """Regex fallback must emit 'unknown' sentiment, not 'neutral'."""
    result = regex_extract(SAMPLE_RESPONSE, KNOWN_FIRMS)
    for mention in result:
        assert mention["sentiment"] == "unknown"


def test_regex_fallback_empty_text():
    result = regex_extract("", KNOWN_FIRMS)
    assert result == []


def test_regex_fallback_no_known_firms():
    result = regex_extract("No firms here.", [])
    assert result == []
