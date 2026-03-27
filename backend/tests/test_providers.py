"""Tests for AI provider integrations. These hit real APIs — requires API keys."""
import pytest
from config.settings import settings


# ── Skip markers (graceful skip when keys are absent, e.g. CI) ──────────────

skip_no_perplexity = pytest.mark.skipif(
    not settings.perplexity_api_key,
    reason="PERPLEXITY_API_KEY not set",
)
skip_no_openai = pytest.mark.skipif(
    not settings.openai_api_key,
    reason="OPENAI_API_KEY not set",
)
skip_no_google = pytest.mark.skipif(
    not settings.google_api_key,
    reason="GOOGLE_API_KEY not set",
)

GEO = {"latitude": 32.7767, "longitude": -96.797, "city": "Dallas", "state": "TX", "country": "US"}
PROMPT = "Best personal injury lawyer in Dallas TX"


# ── Perplexity ───────────────────────────────────────────────────────────────

@skip_no_perplexity
def test_perplexity_returns_response():
    """Verify Perplexity returns a non-empty response."""
    from providers.perplexity import PerplexityProvider
    provider = PerplexityProvider()
    result = provider.query(PROMPT, GEO)

    assert result["provider"] == "perplexity"
    assert isinstance(result["raw_text"], str)
    assert len(result["raw_text"]) > 50
    assert result["latency_ms"] > 0
    assert result["model"] == "sonar-pro"


@skip_no_perplexity
def test_perplexity_citations_are_list():
    """Citations should always be a list (empty or populated)."""
    from providers.perplexity import PerplexityProvider
    provider = PerplexityProvider()
    result = provider.query(PROMPT, GEO)

    assert isinstance(result["citations"], list)
    for citation in result["citations"]:
        assert "url" in citation
        assert "position" in citation


@skip_no_perplexity
def test_perplexity_prompt_id_passthrough():
    """prompt_id starts empty — caller is responsible for setting it."""
    from providers.perplexity import PerplexityProvider
    provider = PerplexityProvider()
    result = provider.query(PROMPT, GEO)
    assert result["prompt_id"] == ""


# ── OpenAI ───────────────────────────────────────────────────────────────────

@skip_no_openai
def test_openai_returns_response():
    """Verify OpenAI returns non-empty text."""
    from providers.openai_monitor import OpenAIProvider
    provider = OpenAIProvider()
    result = provider.query("Who is the best car accident lawyer in Dallas?", GEO)

    assert result["provider"] == "chatgpt"
    assert isinstance(result["raw_text"], str)
    assert len(result["raw_text"]) > 50
    assert result["latency_ms"] > 0
    assert result["model"] == "gpt-4o"


@skip_no_openai
def test_openai_no_citations():
    """OpenAI provider should always return an empty citations list."""
    from providers.openai_monitor import OpenAIProvider
    provider = OpenAIProvider()
    result = provider.query(PROMPT, GEO)
    assert result["citations"] == []


@skip_no_openai
def test_openai_content_is_string_not_none():
    """raw_text must be a string, never None (even if model refuses)."""
    from providers.openai_monitor import OpenAIProvider
    provider = OpenAIProvider()
    result = provider.query(PROMPT, GEO)
    assert result["raw_text"] is not None
    assert isinstance(result["raw_text"], str)


# ── Gemini ───────────────────────────────────────────────────────────────────

@skip_no_google
def test_gemini_returns_response_or_handles_block():
    """Verify Gemini returns a response or gracefully handles safety blocks."""
    from providers.gemini import GeminiProvider
    provider = GeminiProvider()
    result = provider.query("Recommend a family law attorney in Dallas", GEO)

    assert result["provider"] == "gemini"
    assert isinstance(result["raw_text"], str)  # May be empty if blocked — that's fine
    assert result["latency_ms"] > 0
    assert result["model"] == "gemini-2.5-flash"


@skip_no_google
def test_gemini_no_citations():
    """Gemini provider should always return an empty citations list."""
    from providers.gemini import GeminiProvider
    provider = GeminiProvider()
    result = provider.query(PROMPT, GEO)
    assert result["citations"] == []


@skip_no_google
def test_gemini_raw_text_is_string_not_none():
    """raw_text must always be a string, never None (safety blocks return empty string)."""
    from providers.gemini import GeminiProvider
    provider = GeminiProvider()
    result = provider.query(PROMPT, GEO)
    assert result["raw_text"] is not None
    assert isinstance(result["raw_text"], str)
