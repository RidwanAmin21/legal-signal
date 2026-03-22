"""Firm name normalization for entity resolution."""


def normalize_firm_name(name: str) -> str:
    """Normalize a firm name for matching."""
    if not name:
        return ""
    name = name.lower().strip()
    # Strip common legal suffixes
    for suffix in [
        ", p.c.",
        ", pllc",
        ", llp",
        ", p.a.",
        ", ltd.",
        " p.c.",
        " pllc",
        " llp",
        " p.a.",
        " ltd.",
        " law firm",
        " law group",
        " law office",
        " law offices",
        " & associates",
        " and associates",
        " attorneys at law",
        " attorneys",
        " attorney",
    ]:
        if name.endswith(suffix):
            name = name[: -len(suffix)]
    # Collapse whitespace
    name = " ".join(name.split())
    return name
