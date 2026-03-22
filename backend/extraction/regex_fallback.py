"""Fallback extraction when GPT-4o-mini API fails or is unavailable."""
import re


def regex_extract(response_text: str, known_firms: list[str]) -> list[dict]:
    """Extract firm mentions using regex matching against known firms."""
    if not response_text or not response_text.strip():
        return []

    results = []
    text_lower = response_text.lower()
    seen = set()

    for firm in known_firms:
        if not firm or not firm.strip():
            continue
        # Build regex pattern — escape special chars, allow flexible matching
        escaped = re.escape(firm)
        pattern = rf"\b{escaped}\b"
        for match in re.finditer(pattern, text_lower, re.IGNORECASE):
            mention_key = (match.group().lower(), match.start())
            if mention_key in seen:
                continue
            seen.add(mention_key)
            results.append({
                "firm_name": match.group(),
                "position": len(results) + 1,
                "sentiment": "neutral",
                "description": "",
            })

    # Sort by position in text
    results.sort(key=lambda m: response_text.lower().find(m["firm_name"].lower()))
    for i, m in enumerate(results, 1):
        m["position"] = i

    return results
