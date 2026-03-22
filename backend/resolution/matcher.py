"""Alias lookup and fuzzy matching for firm name resolution."""
from rapidfuzz import fuzz

from .normalizer import normalize_firm_name


def resolve_mention(
    raw_name: str,
    registry: list[dict],
    market: str,
    fuzzy_accept: int = 85,
    fuzzy_review: int = 65,
) -> dict:
    """Resolve a raw firm name against the registry.

    Returns: {canonical_name, confidence, needs_review, matched_alias}
    """
    normalized = normalize_firm_name(raw_name)

    # Tier 1: Exact alias match
    for firm in registry:
        if not firm.get("is_active", True):
            continue
        if firm.get("market") != market:
            continue
        all_names = [firm["canonical_name"]] + list(firm.get("aliases", []))
        for alias in all_names:
            if normalize_firm_name(alias) == normalized:
                return {
                    "canonical_name": firm["canonical_name"],
                    "confidence": 1.0,
                    "needs_review": False,
                    "matched_alias": alias,
                }

    # Tier 2: Fuzzy match
    best_score = 0
    best_match = None
    best_alias = None

    for firm in registry:
        if not firm.get("is_active", True):
            continue
        if firm.get("market") != market:
            continue
        base = firm.get("normalized_name") or normalize_firm_name(
            firm.get("canonical_name", "")
        )
        all_names = [base] + [
            normalize_firm_name(a) for a in firm.get("aliases", [])
        ]
        for alias_norm in all_names:
            if not alias_norm:
                continue
            score = fuzz.token_sort_ratio(normalized, alias_norm)
            if score > best_score:
                best_score = score
                best_match = firm
                best_alias = alias_norm

    if best_match and best_score >= fuzzy_accept:
        return {
            "canonical_name": best_match["canonical_name"],
            "confidence": best_score / 100.0,
            "needs_review": False,
            "matched_alias": best_alias,
        }
    elif best_match and best_score >= fuzzy_review:
        return {
            "canonical_name": best_match["canonical_name"],
            "confidence": best_score / 100.0,
            "needs_review": True,
            "matched_alias": best_alias,
        }
    else:
        return {
            "canonical_name": None,
            "confidence": best_score / 100.0 if best_match else 0.0,
            "needs_review": True,
            "matched_alias": None,
        }
