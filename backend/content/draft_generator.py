"""Draft generator — 1 Claude API call per article (~$0.07).

Takes a content brief and client config, asks Claude to write a full
publishable article as clean HTML, then post-processes the response to
extract metadata (word count, statute citations, FAQ count, etc.).
"""
from __future__ import annotations
import logging
import re
import time

import anthropic

from config.settings import settings

logger = logging.getLogger(__name__)

_MODEL = "claude-sonnet-4-20250514"
_MAX_TOKENS = 4000

_SYSTEM = """\
You are a legal content writer specialising in AI-optimised articles for law \
firm websites. Write a complete article based on the brief provided. Follow \
these rules exactly:

STRUCTURE
- Start with the H1 as a question (use the h1 from the brief)
- Answer the question directly and completely in the first paragraph — this is \
what AI will extract as the authoritative answer
- Use subheadings (h2) to organise body sections
- End with a FAQ section using h2 for "Frequently Asked Questions" and h3 for \
each question

CONTENT
- Use the firm name naturally 2–3 times, never more
- Include all local_entities (highways, hospitals, courts) naturally in the text
- Include specific statutes and legal citations where relevant
- Write at a 9th-grade reading level — clear sentences, no jargon without \
explanation
- One brief "Contact [firm name] for a free consultation." sentence at the very \
end is acceptable; no other sales language

STRICT PROHIBITIONS
- No outcome promises: "guarantee", "we will get you", "maximum compensation", \
"you will receive", "we promise", "we ensure recovery", "win your case"
- No comparative claims: "best lawyers", "top firm", "better than", "unlike \
other firms", "most experienced", "#1", "number one"
- No unverifiable statistics without a cited source
- No call-to-action copy in the body beyond the one closing line

OUTPUT
Return ONLY the HTML article — no explanation, no markdown fences, no preamble. \
Use proper semantic tags: h1, h2, h3, p, ul, li, strong, em.\
"""


# ── Post-processing helpers ───────────────────────────────────────────────────

_TAG_RE     = re.compile(r"<[^>]+>")
_STATUTE_RE = re.compile(
    r"(?:Texas\s+)?(?:Civil\s+Practice\s+(?:&|and)\s+Remedies\s+Code\s+)?"
    r"(?:§+|[Ss]ec(?:tion)?\.?\s+)\s*[\d]+(?:\.\d+)?[a-z]?(?:\([a-zA-Z0-9]+\))*",
    re.IGNORECASE,
)
_FAQ_Q_RE   = re.compile(r"<h3[^>]*>(.*?)</h3>", re.IGNORECASE | re.DOTALL)


def _word_count(html: str) -> int:
    text = _TAG_RE.sub(" ", html)
    return len(text.split())


def _count_firm_mentions(html: str, firm_name: str) -> int:
    return len(re.findall(re.escape(firm_name), html, re.IGNORECASE))


def _extract_statutes(html: str) -> list[str]:
    return sorted(set(_STATUTE_RE.findall(html)))


def _extract_faq_questions(html: str) -> list[str]:
    return [re.sub(r"<[^>]+>", "", q).strip() for q in _FAQ_Q_RE.findall(html)]


def _local_entities_used(html: str, brief_entities: list[str]) -> list[str]:
    return [e for e in (brief_entities or []) if e.lower() in html.lower()]


def _strip_fences(text: str) -> str:
    """Remove markdown code fences Claude occasionally wraps HTML in."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        start = 1
        end   = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text  = "\n".join(lines[start:end]).strip()
    return text


# ── Main function ─────────────────────────────────────────────────────────────

def generate_draft(brief: dict, client: dict) -> dict:
    """Generate a full article draft from a content brief.

    Args:
        brief:  Output of generate_brief().
        client: The client row from the clients table.

    Returns:
        Dict with html, word_count, firm_name_count, local_entities_used,
        statutes_cited, faq_count.  Suitable for storage in content_drafts.

    Raises:
        RuntimeError: if ANTHROPIC_API_KEY is not configured.
    """
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set — cannot generate draft")

    import json as _json
    sdk = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_message = (
        f"Brief:\n{_json.dumps(brief, indent=2)}\n\n"
        f"Client firm name: {client['firm_name']}\n\n"
        f"Write the full article now."
    )

    logger.info(
        "Draft generation starting | model=%s | firm=%s | title=%s",
        _MODEL, client["firm_name"], brief.get("title", "unknown")[:60],
    )

    start = time.time()
    response = sdk.messages.create(
        model=_MODEL,
        max_tokens=_MAX_TOKENS,
        system=_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )
    latency_ms = int((time.time() - start) * 1000)

    usage = response.usage
    logger.info(
        "Draft generation API call completed | latency_ms=%d | response_len=%d | "
        "input_tokens=%s | output_tokens=%s",
        latency_ms, len(response.content[0].text),
        usage.input_tokens if usage else "n/a",
        usage.output_tokens if usage else "n/a",
    )

    html = _strip_fences(response.content[0].text)

    firm_name = client["firm_name"]
    faq_qs    = _extract_faq_questions(html)
    word_count = _word_count(html)
    firm_name_count = _count_firm_mentions(html, firm_name)
    statutes = _extract_statutes(html)
    entities_used = _local_entities_used(html, brief.get("local_entities"))

    logger.info(
        "Draft post-processing complete | word_count=%d | firm_mentions=%d | "
        "faq_count=%d | statutes=%d | local_entities_used=%d | firm=%s",
        word_count, firm_name_count, len(faq_qs),
        len(statutes), len(entities_used), firm_name,
    )

    return {
        "html":               html,
        "word_count":         word_count,
        "firm_name_count":    firm_name_count,
        "local_entities_used": entities_used,
        "statutes_cited":     statutes,
        "faq_count":          len(faq_qs),
        "faq_questions_found": faq_qs,
    }
