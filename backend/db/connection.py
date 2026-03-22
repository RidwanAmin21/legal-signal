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
        db.table("prompts").upsert({
            "text": p["text"],
            "practice_area": p["practice_area"],
            "metro": metro,
            "intent_type": p["intent_type"],
            "is_active": True,
        }, on_conflict="text,metro").execute()
        inserted += 1
    logger.info("Seeded %d prompts for metro=%s", inserted, metro)
    return inserted


def seed_registry(market: str) -> int:
    """Seed firm_registry for a market from db/seeds/{market}.json."""
    db = get_supabase()
    seeds_dir = Path(__file__).parent / "seeds"
    seed_file = seeds_dir / f"{market}.json"

    if seed_file.exists():
        with open(seed_file, encoding="utf-8") as f:
            default_firms = json.load(f)
        logger.info("Loading %d firms from %s", len(default_firms), seed_file)
    else:
        logger.warning("No seed file found at %s — using empty list", seed_file)
        default_firms = []

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
