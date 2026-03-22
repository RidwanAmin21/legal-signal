#!/usr/bin/env python3
"""
DEBUG TOOL ONLY — does NOT save anything to the database.

Use this to manually test API queries and inspect raw responses.
For production pipeline runs use: python main.py run --client <name>

Usage:
    cd backend
    python scrape.py [--platform perplexity|chatgpt|gemini|all] [--limit N]

    --limit N    Run only first N prompts (default: all, use 2-3 for quick test)
    --metro      Metro/market for prompts (default: dallas)

Requires .env with at least one of: PERPLEXITY_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
"""
import sys
print("WARNING: scrape.py is a debug tool. Nothing is saved to the database.", file=sys.stderr)
print("For production runs: python main.py run --client <name>\n", file=sys.stderr)
import argparse
import json
import sys
import time
from pathlib import Path

# Ensure backend is in path when run from project root
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.settings import settings
from extraction.extractor import extract_mentions
from providers import PerplexityProvider, OpenAIProvider, GeminiProvider


PROVIDERS = {
    "perplexity": PerplexityProvider,
    "chatgpt": OpenAIProvider,
    "gemini": GeminiProvider,
}

DEFAULT_GEO = {"city": "Dallas", "state": "TX", "latitude": 32.7767, "longitude": -96.797, "country": "US"}
SAMPLE_FIRMS = ["Mullen & Mullen Law Firm", "The Callahan Law Firm", "Angel Reyes & Associates", "Thompson Law"]
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
RATE_LIMIT_SEC = 0.5


def load_prompts(metro: str = "dallas", limit: int | None = None) -> list[dict]:
    """Load prompts from prompts/{metro}.json."""
    path = PROMPTS_DIR / f"{metro}.json"
    if not path.exists():
        raise FileNotFoundError(f"Prompts file not found: {path}")
    with open(path, encoding="utf-8") as f:
        prompts = json.load(f)
    if limit:
        prompts = prompts[:limit]
    return prompts


def get_available_providers():
    """Return providers that have API keys configured."""
    available = []
    if settings.perplexity_api_key:
        available.append("perplexity")
    if settings.openai_api_key:
        available.append("chatgpt")
    if settings.google_api_key:
        available.append("gemini")
    return available


def run_scraper(platform: str = "all", metro: str = "dallas", limit: int | None = None):
    """Run the AI scraper for all 26 prompts (or limited subset)."""
    available = get_available_providers()
    if not available:
        print("No API keys found. Set at least one in .env:")
        print("  PERPLEXITY_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY")
        sys.exit(1)

    platforms = available if platform == "all" else [p for p in [platform] if p in available]
    if not platforms:
        print(f"Platform '{platform}' not available (no API key). Available: {', '.join(available)}")
        sys.exit(1)

    prompts = load_prompts(metro=metro, limit=limit)
    total_queries = len(prompts) * len(platforms)

    print(f"Running scraper: {len(prompts)} prompts × {len(platforms)} platform(s) = {total_queries} API calls")
    print(f"Platforms: {', '.join(platforms)}")
    print(f"Rate limit: {RATE_LIMIT_SEC}s between calls\n")

    results = []
    errors = []
    all_mentions = []

    for i, prompt in enumerate(prompts, 1):
        prompt_text = prompt.get("text", "")
        prompt_id = prompt.get("id", str(i))
        practice = prompt.get("practice_area", "")
        intent = prompt.get("intent_type", "")

        for platform_name in platforms:
            try:
                provider = PROVIDERS[platform_name]()
                result = provider.query(prompt_text, DEFAULT_GEO)
                result["prompt_id"] = prompt_id

                mentions = extract_mentions(result["raw_text"], SAMPLE_FIRMS)
                for m in mentions:
                    m["prompt_id"] = prompt_id
                    m["platform"] = platform_name
                    all_mentions.append(m)

                results.append({
                    "prompt_id": prompt_id,
                    "platform": platform_name,
                    "latency_ms": result["latency_ms"],
                    "response_len": len(result["raw_text"]),
                    "mentions": len(mentions),
                })
                print(f"  [{i}/{len(prompts)}] {platform_name} — {len(mentions)} mentions ({result['latency_ms']}ms)")

                time.sleep(RATE_LIMIT_SEC)
            except Exception as e:
                errors.append({"prompt_id": prompt_id, "platform": platform_name, "error": str(e)})
                print(f"  [{i}/{len(prompts)}] {platform_name} — ERROR: {e}")

    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Responses: {len(results)}/{total_queries}")
    print(f"Errors: {len(errors)}")
    print(f"Total firm mentions extracted: {len(all_mentions)}")

    if all_mentions:
        firms = {}
        for m in all_mentions:
            name = m.get("firm_name", "?")
            firms[name] = firms.get(name, 0) + 1
        print("\nMentions by firm:")
        for name, count in sorted(firms.items(), key=lambda x: -x[1])[:15]:
            print(f"  {name}: {count}")


def main():
    parser = argparse.ArgumentParser(description="LegalSignal AI Scraper — 26 prompts")
    parser.add_argument(
        "--platform",
        choices=["perplexity", "chatgpt", "gemini", "all"],
        default="all",
        help="Which AI platform(s) to query",
    )
    parser.add_argument(
        "--metro",
        default="dallas",
        help="Metro for prompt library (default: dallas)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Run only first N prompts (e.g. 3 for quick test)",
    )
    args = parser.parse_args()
    run_scraper(platform=args.platform, metro=args.metro, limit=args.limit)


if __name__ == "__main__":
    main()
