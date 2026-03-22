"""Tests for the extraction module."""
import pytest

from extraction.extractor import extract_mentions


def test_extraction_returns_list():
    """Verify extraction returns a list of mention dicts."""
    sample_response = (
        "I recommend Mullen & Mullen Law Firm and The Callahan Law Firm "
        "for personal injury cases in Dallas."
    )
    known_firms = [
        "Mullen & Mullen Law Firm",
        "The Callahan Law Firm",
        "Angel Reyes & Associates",
    ]
    result = extract_mentions(sample_response, known_firms)
    assert isinstance(result, list)
    assert len(result) >= 2
    for mention in result:
        assert "firm_name" in mention
        assert "position" in mention
        assert "sentiment" in mention


def test_extraction_handles_empty_response():
    """Verify extraction returns empty list for empty input."""
    result = extract_mentions("", ["Some Firm"])
    assert result == []


def test_extraction_handles_none():
    """Verify extraction doesn't crash on None input."""
    result = extract_mentions(None, ["Some Firm"])
    assert result == []
