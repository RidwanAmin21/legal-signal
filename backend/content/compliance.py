"""Bar compliance scanner — regex and string matching only, zero API calls.

Catches the most common bar rule violations before a draft is delivered.
This is NOT a legal review — it is an automated flag system. False positives
are preferred over false negatives: it is better to flag clean copy for
attorney review than to let a violation through.

Checks:
  1. Outcome promises    (severity: high)
  2. Comparative claims  (severity: high)
  3. Unsupported stats   (severity: medium) — number/% without nearby source citation
  4. Missing disclaimer  (severity: low)
  5. Excessive firm name mentions > 5  (severity: low)
"""
from __future__ import annotations
import re

# ── Pattern tables ────────────────────────────────────────────────────────────

_OUTCOME_PATTERNS: list[tuple[str, str]] = [
    (r"\bguarantee[ds]?\b",                      "guarantee"),
    (r"\bwe(?:'ll| will) get you\b",              "we will get you"),
    (r"\bmaximum compensation\b",                 "maximum compensation"),
    (r"\byou will receive\b",                     "you will receive"),
    (r"\bwe promise\b",                           "we promise"),
    (r"\bwe ensure(?:\s+\w+){0,3}\s+recovery\b", "we ensure recovery"),
    (r"\bwe will recover\b",                      "we will recover"),
    (r"\bwin your case\b",                        "win your case"),
    (r"\bsecure(?:s|d)? (?:you |your )?(?:a )?(?:full |maximum )?(?:settlement|verdict|recovery|award)\b",
     "secure settlement/verdict promise"),
]

_COMPARATIVE_PATTERNS: list[tuple[str, str]] = [
    (r"\bbest lawyers?\b",          "best lawyers"),
    (r"\btop (?:rated |ranked )?(?:law )?firm\b", "top firm"),
    (r"\bbetter than\b",           "better than"),
    (r"\bunlike other firms?\b",   "unlike other firms"),
    (r"\bmost experienced\b",      "most experienced"),
    (r"\b#\s*1\b",                 "#1 claim"),
    (r"\bnumber\s+one\b",          "number one claim"),
    (r"\bhighest[- ]rated\b",      "highest-rated"),
    (r"\baward[- ]winning\b",      "award-winning"),
]

# A percentage or ratio that looks like a statistic
_STAT_RE = re.compile(r"\b\d+\.?\d*\s*(?:%|percent)\b", re.IGNORECASE)

# Phrases near a statistic that suggest it has a source
_CITATION_NEAR_RE = re.compile(
    r"\b(?:according\s+to|source[s]?|per\s+the|study|report|data|"
    r"statistic[s]?|research|survey|published|cited?|reference)\b",
    re.IGNORECASE,
)

_DISCLAIMER_PATTERNS: list[str] = [
    r"attorney[- ]client\s+relationship",
    r"not\s+legal\s+advice",
    r"results?\s+may\s+vary",
    r"individual\s+results",
    r"prior\s+results",
    r"disclaimer",
    r"no\s+representation\s+is\s+made",
    r"does\s+not\s+constitute\s+legal\s+advice",
]

# How many characters on each side of a stat to scan for a citation phrase
_CITATION_WINDOW = 200

# Max acceptable firm-name mentions before flagging as promotional
_MAX_FIRM_MENTIONS = 5


# ── Helpers ───────────────────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")


def _plain(html: str) -> str:
    """Strip HTML tags for pattern matching on visible text."""
    return _TAG_RE.sub(" ", html)


def _paragraph_number(html: str, char_pos: int) -> str:
    """Approximate paragraph number by counting <p> opens before char_pos."""
    count = html[:char_pos].count("<p") + 1
    return f"paragraph {count}"


def _compile(patterns: list[tuple[str, str]]) -> list[tuple[re.Pattern, str]]:
    return [(re.compile(pat, re.IGNORECASE), label) for pat, label in patterns]


_OUTCOME_RE    = _compile(_OUTCOME_PATTERNS)
_COMPARATIVE_RE = _compile(_COMPARATIVE_PATTERNS)


# ── Main function ─────────────────────────────────────────────────────────────

def scan_compliance(html: str, firm_name: str) -> dict:
    """Scan an HTML article draft for bar rule compliance flags.

    Args:
        html:      The article HTML produced by generate_draft().
        firm_name: The client's canonical firm name.

    Returns:
        Dict with: passed (bool), flags (list), flag_count (int),
        high_severity_count (int), recommendation (str).
        All fields are JSON-serialisable.
    """
    flags: list[dict] = []
    plain = _plain(html)

    # ── 1. Outcome promises ───────────────────────────────────────────────────
    for pattern, label in _OUTCOME_RE:
        for m in pattern.finditer(plain):
            flags.append({
                "type":     "outcome_promise",
                "severity": "high",
                "text":     m.group(0),
                "location": _paragraph_number(html, m.start()),
            })

    # ── 2. Comparative claims ─────────────────────────────────────────────────
    for pattern, label in _COMPARATIVE_RE:
        for m in pattern.finditer(plain):
            flags.append({
                "type":     "comparative_claim",
                "severity": "high",
                "text":     m.group(0),
                "location": _paragraph_number(html, m.start()),
            })

    # ── 3. Unsupported statistics ─────────────────────────────────────────────
    for m in _STAT_RE.finditer(plain):
        start = max(0, m.start() - _CITATION_WINDOW)
        end   = min(len(plain), m.end() + _CITATION_WINDOW)
        context = plain[start:end]
        if not _CITATION_NEAR_RE.search(context):
            flags.append({
                "type":     "unsupported_statistic",
                "severity": "medium",
                "text":     m.group(0),
                "location": _paragraph_number(html, m.start()),
            })

    # ── 4. Missing disclaimer ─────────────────────────────────────────────────
    has_disclaimer = any(
        re.search(pat, plain, re.IGNORECASE) for pat in _DISCLAIMER_PATTERNS
    )
    if not has_disclaimer:
        flags.append({
            "type":     "missing_disclaimer",
            "severity": "low",
            "text":     "No disclaimer or 'not legal advice' language found",
            "location": "throughout",
        })

    # ── 5. Excessive firm mentions ────────────────────────────────────────────
    mention_count = len(re.findall(re.escape(firm_name), plain, re.IGNORECASE))
    if mention_count > _MAX_FIRM_MENTIONS:
        flags.append({
            "type":     "excessive_mentions",
            "severity": "low",
            "text":     f"Firm name appears {mention_count} times (limit: {_MAX_FIRM_MENTIONS})",
            "location": "throughout",
        })

    high_count = sum(1 for f in flags if f["severity"] == "high")
    passed     = high_count == 0

    recommendation = _build_recommendation(flags, passed)

    return {
        "passed":              passed,
        "flags":               flags,
        "flag_count":          len(flags),
        "high_severity_count": high_count,
        "recommendation":      recommendation,
    }


def _build_recommendation(flags: list[dict], passed: bool) -> str:
    if not flags:
        return "No compliance issues detected."
    if not passed:
        high = [f for f in flags if f["severity"] == "high"]
        first = high[0]
        rule_ref = {
            "outcome_promise":   "Texas Disciplinary Rules of Professional Conduct Rule 7.01",
            "comparative_claim": "Texas Disciplinary Rules of Professional Conduct Rule 7.02",
        }.get(first["type"], "Texas Disciplinary Rules of Professional Conduct Rule 7.01–7.05")
        return (
            f"Review {first['location']} — contains a {first['type'].replace('_', ' ')} "
            f"that may violate {rule_ref}. Do not publish until resolved."
        )
    return "Low/medium severity flags found. Attorney review recommended before publishing."
