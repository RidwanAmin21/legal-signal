# ── Mention signal weights (used inside compute_visibility_score) ────────────
MENTION_WEIGHT = 50
POSITION_WEIGHT = 30
SENTIMENT_WEIGHT = 20

# ── Composite score weights (applied when Perplexity citations are available) ─
# mention_signal (0-100) × 50% + source_signal (0-100) × 40% + site_readiness × 10%
MENTION_SIGNAL_WEIGHT = 0.50
SOURCE_SIGNAL_WEIGHT  = 0.40
SITE_READINESS_WEIGHT = 0.10

# Hardcoded until the site-audit module ships
SITE_READINESS_DEFAULT = 50

# ── Source categorization domains ─────────────────────────────────────────────
DIRECTORY_DOMAINS: list[str] = [
    "avvo.com", "justia.com", "superlawyers.com",
    "martindale.com", "lawyers.com", "findlaw.com", "nolo.com",
]
LEGAL_RESOURCE_DOMAINS: list[str] = [
    "eloa.org", "topverdict.com", "ontoplist.com", "bestlawfirms.usnews.com",
]
EDITORIAL_DOMAINS: list[str] = [
    "forbes.com", "usnews.com", "newsweek.com", "bloomberg.com",
]
REVIEW_DOMAINS: list[str] = [
    "yelp.com", "bbb.org",
]

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
    "gemini": "gemini-2.5-flash",
}
