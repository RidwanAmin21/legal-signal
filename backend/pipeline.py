"""Full monitoring pipeline: AI APIs → extraction → resolution → scoring → DB."""
import json
import logging
import tempfile
import time
from datetime import date, datetime, timezone
from pathlib import Path

from db.connection import get_supabase, seed_prompts
from extraction.extractor import extract_mentions
from providers.perplexity import PerplexityProvider
from providers.openai_monitor import OpenAIProvider
from providers.gemini import GeminiProvider
from resolution.matcher import resolve_mention
from scoring.scorer import compute_visibility_score
from reporting.pdf_renderer import render_report
from reporting.email_delivery import send_weekly_report
from config.settings import settings
from jinja2 import Environment, FileSystemLoader

_TEMPLATE_DIR = Path(__file__).parent / "reporting" / "templates"

logger = logging.getLogger(__name__)

PROVIDERS = {
    "perplexity": PerplexityProvider,
    "chatgpt": OpenAIProvider,
    "gemini": GeminiProvider,
}

RATE_LIMIT_SEC = 0.5
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _get_available_providers():
    """Return only providers that have API keys."""
    available = {}
    if settings.perplexity_api_key:
        available["perplexity"] = PerplexityProvider
    if settings.openai_api_key:
        available["chatgpt"] = OpenAIProvider
    if settings.google_api_key:
        available["gemini"] = GeminiProvider
    return available




def run_pipeline(client_name: str = None, all_clients: bool = False):
    """Run the full monitoring pipeline."""
    db = get_supabase()

    if all_clients:
        result = db.table("clients").select("*").eq("is_active", True).execute()
        clients = result.data
    else:
        config_path = Path(__file__).parent / "clients" / f"{client_name}.json"
        if not config_path.exists():
            raise FileNotFoundError(f"Client config not found: {config_path}")
        with open(config_path, encoding="utf-8") as f:
            client_config = json.load(f)
        result = (
            db.table("clients")
            .select("*")
            .eq("firm_name", client_config["firm_name"])
            .execute()
        )
        if not result.data:
            raise ValueError(
                f"Client '{client_config['firm_name']}' not found in database. "
                "Run: python main.py seed-demo"
            )
        clients = result.data

    providers = _get_available_providers()
    if not providers:
        raise ValueError(
            "No AI API keys configured. Set at least one: "
            "PERPLEXITY_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY"
        )

    for client in clients:
        try:
            _run_single_client(db, client, providers)
        except Exception as e:
            logger.error(f"Pipeline failed for {client['firm_name']}: {e}", exc_info=True)


def _run_single_client(db, client: dict, providers: dict):
    """Execute pipeline for a single client."""
    client_id = client["id"]
    market = client["market_key"]
    geo_config = client.get("geo_config") or {}
    metro = market.split("_")[0]

    # 1. Create monitoring run
    run = db.table("monitoring_runs").insert({
        "client_id": client_id,
        "status": "running",
    }).execute()
    run_id = run.data[0]["id"]

    # 2. Load prompts from DB, fallback to file
    prompts_result = (
        db.table("prompts")
        .select("*")
        .eq("metro", metro)
        .eq("is_active", True)
        .execute()
    )
    prompts = prompts_result.data or []

    if not prompts:
        seed_prompts(metro)
        prompts_result = (
            db.table("prompts")
            .select("*")
            .eq("metro", metro)
            .eq("is_active", True)
            .execute()
        )
        prompts = prompts_result.data or []
        if not prompts:
            raise ValueError(f"No prompts for metro={metro}. Add prompts/dallas.json and run seed-prompts.")

    practice_areas = client.get("practice_areas") or []
    if practice_areas:
        prompts = [p for p in prompts if p.get("practice_area") in practice_areas]

    # 3. Load firm registry
    registry_result = (
        db.table("firm_registry")
        .select("*")
        .eq("market", market)
        .eq("is_active", True)
        .execute()
    )
    registry = registry_result.data or []
    known_firm_names = [f["canonical_name"] for f in registry]

    errors = []
    total_responses = 0
    total_mentions = 0
    review_items = 0

    for prompt in prompts:
        for platform_name, ProviderClass in providers.items():
            try:
                provider = ProviderClass()
                result = provider.query(prompt["text"], geo_config)
                result["prompt_id"] = prompt["id"]

                raw_mentions = extract_mentions(result["raw_text"], known_firm_names)

                resolved_mentions = []
                for mention in raw_mentions:
                    resolution = resolve_mention(
                        mention.get("firm_name", ""),
                        registry,
                        market,
                    )
                    mention["canonical_name"] = resolution["canonical_name"]
                    mention["confidence"] = resolution["confidence"]
                    mention["needs_review"] = resolution["needs_review"]
                    mention["matched_alias"] = resolution["matched_alias"]
                    resolved_mentions.append(mention)
                    if resolution["needs_review"]:
                        review_items += 1

                total_mentions += len(resolved_mentions)

                db.table("monitoring_responses").upsert({
                    "run_id": run_id,
                    "client_id": client_id,
                    "prompt_id": prompt["id"],
                    "platform": platform_name,
                    "raw_text": result["raw_text"],
                    "citations": result["citations"],
                    "firms_mentioned": resolved_mentions,
                    "response_latency_ms": result["latency_ms"],
                }, on_conflict="run_id,prompt_id,platform").execute()

                total_responses += 1
                time.sleep(RATE_LIMIT_SEC)

            except Exception as e:
                errors.append({
                    "prompt_id": str(prompt.get("id", "")),
                    "platform": platform_name,
                    "error": str(e),
                })
                logger.warning(f"Failed {platform_name} for prompt: {e}")

    # 4. Compute scores
    all_responses = (
        db.table("monitoring_responses")
        .select("firms_mentioned, platform, prompt_id")
        .eq("run_id", run_id)
        .execute()
    )

    client_firm = client["firm_name"]
    client_mentions = []
    all_competitor_mentions = {}
    total_prompt_count = len(prompts) * len(providers)

    for resp in all_responses.data or []:
        for mention in resp.get("firms_mentioned") or []:
            canonical = mention.get("canonical_name")
            if not canonical:
                continue
            mention_record = {
                "canonical_name": canonical,
                "position": mention.get("position"),
                "sentiment": mention.get("sentiment"),
                "platform": resp["platform"],
                "prompt_id": resp["prompt_id"],
            }
            if canonical.lower() == client_firm.lower():
                client_mentions.append(mention_record)
            else:
                if canonical not in all_competitor_mentions:
                    all_competitor_mentions[canonical] = []
                all_competitor_mentions[canonical].append(mention_record)

    score_data = compute_visibility_score(client_mentions, total_prompt_count)

    for platform in providers:
        platform_prompts = len(prompts)
        platform_score = compute_visibility_score(client_mentions, platform_prompts, platform=platform)
        score_data[f"{platform}_score"] = platform_score["overall_score"]

    competitor_scores = {}
    for comp_name, comp_mentions in all_competitor_mentions.items():
        comp_score = compute_visibility_score(comp_mentions, total_prompt_count)
        competitor_scores[comp_name] = comp_score["overall_score"]
    score_data["competitor_scores"] = competitor_scores

    # 5. Store visibility score
    db.table("visibility_scores").insert({
        "client_id": client_id,
        "run_id": run_id,
        "week_date": date.today().isoformat(),
        **score_data,
    }).execute()

    # 6. Update run status to completed
    db.table("monitoring_runs").update({
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "prompts_sent": len(prompts) * len(providers),
        "responses_received": total_responses,
        "mentions_extracted": total_mentions,
        "review_items_created": review_items,
        "error_log": errors,
    }).eq("id", run_id).execute()

    logger.info(
        f"Pipeline complete for {client_firm}: "
        f"score={score_data['overall_score']}, "
        f"mentions={total_mentions}, "
        f"reviews={review_items}, "
        f"errors={len(errors)}"
    )

    # 7. Generate PDF report + send email
    _deliver_report(db, client, score_data, run_id)


def _deliver_report(db, client: dict, score_data: dict, run_id: str):
    """Render PDF report and send email. Logs errors but does not raise."""
    client_id = client["id"]
    client_firm = client["firm_name"]
    contact_email = client.get("contact_email")
    week_date = date.today().isoformat()

    if not contact_email:
        logger.warning(f"No contact_email for {client_firm} — skipping email delivery")
        return

    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email delivery")
        return

    try:
        # Fetch the previous score for delta display
        prev_result = (
            db.table("visibility_scores")
            .select("*")
            .eq("client_id", client_id)
            .neq("run_id", run_id)
            .order("week_date", desc=True)
            .limit(1)
            .execute()
        )
        previous_score = prev_result.data[0] if prev_result.data else None

        # Build a sorted competitors list for the PDF table
        competitors = [
            {"name": name, "score": s}
            for name, s in score_data.get("competitor_scores", {}).items()
        ]
        competitors.sort(key=lambda x: x["score"], reverse=True)

        # Render email HTML from digest template
        env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)))
        digest_template = env.get_template("weekly_digest.html")
        email_html = digest_template.render(
            client=client,
            score=score_data,
            previous_score=previous_score,
            week_date=week_date,
        )

        # Render PDF to a temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            pdf_path = tmp.name

        render_report(
            client=client,
            score=score_data,
            previous_score=previous_score,
            competitors=competitors,
            week_date=week_date,
            output_path=pdf_path,
        )

        # Send
        send_weekly_report(
            to_email=contact_email,
            firm_name=client_firm,
            score=score_data["overall_score"],
            pdf_path=pdf_path,
            html_content=email_html,
        )

        # Mark run as delivered
        db.table("monitoring_runs").update({
            "status": "delivered",
        }).eq("id", run_id).execute()

        logger.info(f"Report delivered to {contact_email} for {client_firm}")

    except Exception as e:
        logger.error(f"Report delivery failed for {client_firm}: {e}", exc_info=True)
    finally:
        # Clean up temp PDF regardless of success or failure
        try:
            Path(pdf_path).unlink(missing_ok=True)
        except Exception:
            pass
