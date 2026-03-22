"""Supabase client and database utilities."""
import json
import logging
from pathlib import Path

from supabase import create_client, Client

from config.settings import settings

logger = logging.getLogger(__name__)

_supabase: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client singleton."""
    global _supabase
    if _supabase is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "Add them to .env"
            )
        _supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _supabase


def run_migrations() -> None:
    """Print migration instructions. Run SQL manually in Supabase SQL Editor."""
    migrations_dir = Path(__file__).parent / "migrations"
    sql_file = migrations_dir / "001_initial_schema.sql"
    if sql_file.exists():
        print("Run the following SQL in Supabase SQL Editor:")
        print(f"  {sql_file}")
        print("\nOr copy the contents:")
        print(sql_file.read_text())
    else:
        raise FileNotFoundError(f"Migration file not found: {sql_file}")


def seed_prompts(metro: str = "dallas") -> int:
    """Seed prompts table from prompts/{metro}.json. Returns count inserted."""
    db = get_supabase()
    prompts_dir = Path(__file__).parent.parent / "prompts"
    path = prompts_dir / f"{metro}.json"
    if not path.exists():
        raise FileNotFoundError(f"Prompts file not found: {path}")

    with open(path, encoding="utf-8") as f:
        prompts = json.load(f)

    inserted = 0
    for p in prompts:
        try:
            db.table("prompts").insert({
                "text": p["text"],
                "practice_area": p["practice_area"],
                "metro": metro,
                "intent_type": p["intent_type"],
                "is_active": True,
            }).execute()
            inserted += 1
        except Exception as e:
            err = str(e).lower()
            if "duplicate" in err or "unique" in err or "already exists" in err:
                logger.debug("Prompt already exists: %s", p.get("text", "")[:50])
            else:
                raise
    logger.info("Seeded %d prompts for metro=%s", inserted, metro)
    return inserted


def seed_registry(market: str) -> int:
    """Seed firm_registry for a market. Uses minimal Dallas PI firms if no seed file."""
    db = get_supabase()
    # Minimal Dallas PI firms for initial testing
    default_firms = [
        {"canonical_name": "Mullen & Mullen Law Firm", "aliases": ["Mullen & Mullen", "Shane Mullen"], "normalized_name": "mullen mullen", "domain": "mullenandmullen.com"},
        {"canonical_name": "The Callahan Law Firm", "aliases": ["Callahan Law"], "normalized_name": "callahan", "domain": "callahanlaw.com"},
        {"canonical_name": "Angel Reyes & Associates", "aliases": ["Angel Reyes", "Reyes & Associates"], "normalized_name": "angel reyes", "domain": "angelreyeslaw.com"},
        {"canonical_name": "Thompson Law", "aliases": ["Thompson Law Firm"], "normalized_name": "thompson", "domain": "thompsonlaw.com"},
        {"canonical_name": "Baron & Budd", "aliases": [], "normalized_name": "baron budd", "domain": "baronandbudd.com"},
        {"canonical_name": "The Lenahan Law Firm", "aliases": ["Lenahan Law"], "normalized_name": "lenahan", "domain": "lenahanlaw.com"},
        {"canonical_name": "Varghese Summersett", "aliases": [], "normalized_name": "varghese summersett", "domain": "versustexas.com"},
    ]
    inserted = 0
    for firm in default_firms:
        try:
            db.table("firm_registry").insert({
                "market": market,
                "canonical_name": firm["canonical_name"],
                "aliases": firm.get("aliases", []),
                "domain": firm.get("domain"),
                "normalized_name": firm.get("normalized_name"),
                "is_active": True,
            }).execute()
            inserted += 1
        except Exception as e:
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                logger.debug("Firm already in registry: %s", firm["canonical_name"])
            else:
                raise
    logger.info("Seeded %d firms for market=%s", inserted, market)
    return inserted


def seed_demo_client() -> dict:
    """Create a demo client if none exist. Returns the client dict."""
    db = get_supabase()
    result = db.table("clients").select("id").limit(1).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]

    client = {
        "firm_name": "Mullen & Mullen Law Firm",
        "market_key": "dallas_pi",
        "contact_email": "demo@legalsignal.com",
        "practice_areas": ["personal_injury"],
        "geo_config": {
            "city": "Dallas",
            "state": "TX",
            "latitude": 32.7767,
            "longitude": -96.797,
            "country": "US",
        },
    }
    r = db.table("clients").insert(client).execute()
    logger.info("Created demo client: %s", client["firm_name"])
    return r.data[0]
