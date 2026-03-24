# ── Mention signal weights (used inside compute_visibility_score) ────────────
MENTION_WEIGHT = 50
POSITION_WEIGHT = 30
SENTIMENT_WEIGHT = 20

# ── Composite score weights (applied when Perplexity citations are available) ─
# mention_signal (0-100) × 50% + source_signal (0-100) × 40% + site_readiness × 10%
COMPOSITE_MENTION_WEIGHT = 50
COMPOSITE_SOURCE_WEIGHT = 40
COMPOSITE_SITE_WEIGHT = 10

# Hardcoded until the site-audit module ships
SITE_READINESS_DEFAULT = 50

# ── Score bands ───────────────────────────────────────────────────────────────
SCORE_BANDS = {
    "excellent": (70, 100),
    "moderate": (40, 69),
    "weak": (15, 39),
    "invisible": (0, 14),
}

# ── Entity resolution thresholds ─────────────────────────────────────────────
FUZZY_AUTO_ACCEPT = 85
FUZZY_REVIEW = 65

# ── Platforms ─────────────────────────────────────────────────────────────────
PLATFORMS = ["perplexity", "chatgpt", "gemini"]

# ── Extraction model ──────────────────────────────────────────────────────────
EXTRACTION_MODEL = "gpt-4o-mini"

# ── Monitoring models per platform ────────────────────────────────────────────
PROVIDER_MODELS = {
    "perplexity": "sonar-pro",
    "chatgpt": "gpt-4o",
    "gemini": "gemini-2.0-flash",
}
