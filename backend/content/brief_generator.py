"""Content brief generator — 1 Claude API call per brief (~$0.04).

Takes the top-ranked gap opportunity and the client config, then asks Claude
to produce a structured JSON content brief that a draft generator can turn
into a publishable article.
"""
from __future__ import annotations
import json
import logging
import time

import anthropic

from config.settings import settings

logger = logging.getLogger(__name__)

_MODEL = "claude-sonnet-4-20250514"
_MAX_TOKENS = 2000

_SYSTEM = (
    "You are a legal content strategist. Generate a content brief for an article "
    "that will help AI search engines cite this law firm when answering questions "
    "about this topic. The article must be structured for AI citation: question as "
    "the H1, direct answer in paragraph one, FAQ section with 5 questions, local "
    "details throughout. Do NOT include outcome promises, guaranteed results, or "
    "comparative claims about other firms.\n\n"
    "Return ONLY a valid JSON object — no markdown fences, no preamble — with "
    "exactly these keys:\n"
    "  title, h1, target_prompt, recommended_url_slug,\n"
    "  key_points (array of 5 strings),\n"
    "  faq_questions (array of 5 strings),\n"
    "  local_entities (array of strings),\n"
    "  schema_type, word_count_target (integer),\n"
    "  seo_title, meta_description"
)


def _build_user_message(gap: dict, client: dict) -> str:
    market_key = client.get("market_key", "")
    parts = market_key.replace("-", "_").split("_")
    city  = parts[0].title() if parts else ""
    state = parts[1].upper() if len(parts) > 1 else ""

    geo_config = client.get("geo_config") or {}
    geo_parts: list[str] = []
    for key, label in [
        ("highways",  "major highways"),
        ("hospitals", "nearby hospitals"),
        ("courts",    "courts"),
        ("statutes",  "relevant statutes"),
    ]:
        if geo_config.get(key):
            geo_parts.append(f"{label}: {', '.join(geo_config[key])}")
    geo_info = "; ".join(geo_parts) or "not specified"

    return (
        f"Gap opportunity:\n"
        f"- Target prompt: {gap['prompt_text']}\n"
        f"- Gap type: {gap['gap_type']}\n"
        f"- Competitors currently mentioned: "
        f"{', '.join(gap['competitors_present']) or 'none'}\n"
        f"- Citation categories present: "
        f"{', '.join(gap.get('citation_categories_present', [])) or 'none'}\n"
        f"- Suggested topic: {gap['suggested_topic']}\n\n"
        f"Client details:\n"
        f"- Firm name: {client['firm_name']}\n"
        f"- City: {city}\n"
        f"- State: {state}\n"
        f"- Practice areas: {', '.join(client.get('practice_areas') or [])}\n"
        f"- Attorneys: {', '.join(client.get('attorneys') or [])}\n"
        f"- Local context: {geo_info}\n\n"
        f"Generate the JSON content brief now."
    )


def _parse_brief(raw: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop opening fence line (```json or ```) and closing ```
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner).strip()
    return json.loads(text)


def generate_brief(gap: dict, client: dict) -> dict:
    """Generate a structured content brief for the given gap opportunity.

    Args:
        gap:    A gap dict from detect_gaps().
        client: The client row from the clients table.

    Returns:
        Brief dict suitable for passing to generate_draft() and for storage
        in content_drafts.brief (JSONB).

    Raises:
        RuntimeError: if ANTHROPIC_API_KEY is not configured.
        ValueError:   if the model returns non-JSON or missing required keys.
    """
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set — cannot generate brief")

    sdk = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    user_message = _build_user_message(gap, client)

    logger.info(
        "Brief generation starting | model=%s | firm=%s | gap_type=%s | prompt=%s",
        _MODEL, client["firm_name"], gap["gap_type"], gap["prompt_text"][:80],
    )

    start = time.time()
    response = sdk.messages.create(
        model=_MODEL,
        max_tokens=_MAX_TOKENS,
        system=_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )
    latency_ms = int((time.time() - start) * 1000)

    raw = response.content[0].text
    usage = response.usage

    logger.info(
        "Brief generation API call completed | latency_ms=%d | response_len=%d | "
        "input_tokens=%s | output_tokens=%s",
        latency_ms, len(raw),
        usage.input_tokens if usage else "n/a",
        usage.output_tokens if usage else "n/a",
    )

    brief = _parse_brief(raw)

    brief["target_prompt"] = gap["prompt_text"]
    brief["gap_type"]       = gap["gap_type"]
    brief["prompt_id"]      = gap.get("prompt_id")

    required = {
        "title", "h1", "recommended_url_slug", "key_points",
        "faq_questions", "local_entities", "schema_type",
        "word_count_target", "seo_title", "meta_description",
    }
    missing = required - brief.keys()
    if missing:
        logger.error(
            "Brief missing required keys | missing=%s | firm=%s",
            missing, client["firm_name"],
        )
        raise ValueError(f"Brief is missing required keys: {missing}")

    logger.info(
        "Brief generated successfully | title=%s | word_count_target=%s | firm=%s",
        brief.get("title", "unknown")[:60],
        brief.get("word_count_target", "n/a"),
        client["firm_name"],
    )

    return brief
