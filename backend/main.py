#!/usr/bin/env python3
"""
LegalSignal Pipeline — AI monitoring for law firm visibility.

Usage:
    python main.py run --client example     # Run for one client
    python main.py run --all                # Run for all active clients
    python main.py health                   # Check DB connection and config
    python main.py seed-demo                # Create demo client + seed prompts + registry
    python main.py seed-prompts             # Seed prompts from prompts/dallas.json
    python main.py seed-registry --market dallas_pi
    python main.py migrate                  # Print migration SQL
"""
import argparse
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def _init_sentry():
    """Initialize Sentry if DSN is configured and not in development."""
    from config.settings import settings
    sentry_dsn = os.environ.get("SENTRY_DSN", "")
    if sentry_dsn and settings.environment != "development":
        import sentry_sdk
        sentry_sdk.init(dsn=sentry_dsn, traces_sample_rate=0.1)
        logging.getLogger(__name__).info("Sentry initialized")


def main():
    parser = argparse.ArgumentParser(description="LegalSignal Pipeline")
    subparsers = parser.add_subparsers(dest="command", help="Command")

    run_parser = subparsers.add_parser("run", help="Run monitoring pipeline")
    run_parser.add_argument("--client", type=str, help="Client config name (e.g. example)")
    run_parser.add_argument("--all", action="store_true", help="Run for all active clients")

    subparsers.add_parser("health", help="Check DB connection and configuration")

    seed_demo_parser = subparsers.add_parser("seed-demo", help="Create demo client, prompts, registry")
    seed_prompts_parser = subparsers.add_parser("seed-prompts", help="Seed prompts table")
    seed_prompts_parser.add_argument("--metro", default="dallas", help="Metro for prompts")
    seed_registry_parser = subparsers.add_parser("seed-registry", help="Seed firm registry")
    seed_registry_parser.add_argument("--market", default="dallas_pi", help="Market key")
    subparsers.add_parser("migrate", help="Print migration SQL for Supabase")

    args = parser.parse_args()

    if args.command == "run":
        _init_sentry()
        from pipeline import run_pipeline
        if args.all:
            run_pipeline(all_clients=True)
        elif args.client:
            run_pipeline(client_name=args.client)
        else:
            print("Specify --client <name> or --all")
            sys.exit(1)

    elif args.command == "health":
        from db.connection import get_supabase
        from config.settings import settings
        db = get_supabase()
        result = db.table("clients").select("id").limit(1).execute()
        client_count = db.table("clients").select("id", count="exact").eq("is_active", True).execute()
        print(f"OK — DB connected")
        print(f"  Active clients: {client_count.count}")
        print(f"  Environment: {settings.environment}")
        print(f"  Perplexity key: {'set' if settings.perplexity_api_key else 'MISSING'}")
        print(f"  OpenAI key:     {'set' if settings.openai_api_key else 'MISSING'}")
        print(f"  Google key:     {'set' if settings.google_api_key else 'MISSING'}")
        print(f"  Resend key:     {'set' if settings.resend_api_key else 'MISSING'}")

    elif args.command == "seed-demo":
        from db.connection import seed_demo_client, seed_prompts, seed_registry
        seed_demo_client()
        seed_prompts("dallas")
        seed_registry("dallas_pi")
        print("Demo client, prompts, and registry seeded.")

    elif args.command == "seed-prompts":
        from db.connection import seed_prompts
        count = seed_prompts(args.metro)
        print(f"Seeded {count} prompts for metro={args.metro}")

    elif args.command == "seed-registry":
        from db.connection import seed_registry
        count = seed_registry(args.market)
        print(f"Seeded {count} firms for market={args.market}")

    elif args.command == "migrate":
        from db.connection import run_migrations
        run_migrations()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
