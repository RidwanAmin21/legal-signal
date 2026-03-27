"""Full monitoring pipeline: AI APIs → extraction → resolution → scoring → DB."""
import json
import logging
import re
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
from scoring.scorer import compute_visibility_score, build_db_score_components
from reporting.pdf_renderer import render_report
from reporting.email_delivery import send_weekly_report
from content.gap_detection import detect_gaps
from content.brief_generator import generate_brief
from content.draft_generator import generate_draft
from content.compliance import scan_compliance
from content.citation_matcher import match_citations
from content.package_assembler import assemble_package
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
    logger.info(
        "Available providers: %s",
        ", ".join(available.keys()) if available else "none",
    )
    return available




def run_pipeline(client_name: str = None, all_clients: bool = False):
    """Run the full monitoring pipeline."""
    pipeline_start = time.time()
    logger.info(
        "Pipeline starting | mode=%s | client_name=%s",
        "all_clients" if all_clients else "single_client",
        client_name or "n/a",
    )

    db = get_supabase()

    if all_clients:
        result = db.table("clients").select("*").eq("is_active", True).execute()
        clients = result.data
        logger.info("Loaded %d active client(s) from database", len(clients))
    else:
        if not re.match(r'^[a-zA-Z0-9_-]+$', client_name or ""):
            raise ValueError(f"Invalid client name: must contain only alphanumeric characters, hyphens, and underscores")
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
        logger.info("Loaded client from config: %s", client_config["firm_name"])

    providers = _get_available_providers()
    if not providers:
        raise ValueError(
            "No AI API keys configured. Set at least one: "
            "PERPLEXITY_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY"
        )

    failed_clients = []
    for i, client in enumerate(clients):
        logger.info(
            "Processing client %d/%d: %s (id=%s)",
            i + 1, len(clients), client["firm_name"], client["id"],
        )
        try:
            _run_single_client(db, client, providers)
        except Exception as e:
            logger.error(f"Pipeline failed for {client['firm_name']}: {e}", exc_info=True)
            failed_clients.append(client["firm_name"])

    pipeline_elapsed = int((time.time() - pipeline_start) * 1000)

    if failed_clients:
        logger.critical(
            "PIPELINE FAILURE: %d client(s) failed: %s | total_elapsed_ms=%d",
            len(failed_clients), ", ".join(failed_clients), pipeline_elapsed,
        )
    else:
        logger.info(
            "Pipeline completed successfully | clients=%d | total_elapsed_ms=%d",
            len(clients), pipeline_elapsed,
        )


def _run_single_client(db, client: dict, providers: dict):
    """Execute pipeline for a single client."""
    client_start = time.time()
    client_id = client["id"]
    client_firm = client["firm_name"]
    today = date.today().isoformat()

    # Idempotency check: skip if a completed/delivered run already exists today
    existing = (
        db.table("monitoring_runs")
        .select("id, status")
        .eq("client_id", client_id)
        .gte("created_at", f"{today}T00:00:00")
        .in_("status", ["completed", "delivered"])
        .limit(1)
        .execute()
    )
    if existing.data:
        logger.info(
            "Skipping %s — already ran today (run_id=%s, status=%s)",
            client_firm, existing.data[0]["id"], existing.data[0]["status"],
        )
        return

    # Clean up any stale running runs from today before starting fresh
    db.table("monitoring_runs").delete().eq("client_id", client_id).eq("status", "running").gte("created_at", f"{today}T00:00:00").execute()

    market = client["market_key"]
    geo_config = client.get("geo_config") or {}
    metro = market.split("_")[0]

    # 1. Create monitoring run
    run = db.table("monitoring_runs").insert({
        "client_id": client_id,
        "status": "running",
    }).execute()
    run_id = run.data[0]["id"]
    logger.info(
        "Monitoring run created | run_id=%s | client=%s | market=%s | metro=%s",
        run_id, client_firm, market, metro,
    )

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
        logger.info("No prompts in DB for metro=%s — seeding from file", metro)
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
        pre_filter = len(prompts)
        prompts = [p for p in prompts if p.get("practice_area") in practice_areas]
        logger.info(
            "Filtered prompts by practice_areas=%s | before=%d | after=%d",
            practice_areas, pre_filter, len(prompts),
        )

    logger.info(
        "Loaded %d prompts | platforms=%s | total_queries=%d",
        len(prompts), list(providers.keys()), len(prompts) * len(providers),
    )

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
    logger.info("Loaded %d firms from registry for market=%s", len(registry), market)

    errors = []
    total_responses = 0
    total_mentions = 0
    review_items = 0
    query_start = time.time()

    for prompt_idx, prompt in enumerate(prompts):
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

                logger.debug(
                    "Query %d/%d [%s] completed | prompt_id=%s | mentions=%d | "
                    "review=%d | latency_ms=%d",
                    prompt_idx + 1, len(prompts), platform_name,
                    prompt["id"], len(resolved_mentions),
                    sum(1 for m in resolved_mentions if m["needs_review"]),
                    result["latency_ms"],
                )

                time.sleep(RATE_LIMIT_SEC)

            except Exception as e:
                errors.append({
                    "prompt_id": str(prompt.get("id", "")),
                    "platform": platform_name,
                    "error": str(e),
                })
                logger.warning(
                    "Query failed | prompt_idx=%d | platform=%s | prompt_id=%s | error=%s",
                    prompt_idx + 1, platform_name, prompt.get("id", ""), e,
                )

    query_elapsed = int((time.time() - query_start) * 1000)
    logger.info(
        "All queries completed | run_id=%s | client=%s | responses=%d/%d | "
        "mentions=%d | review_items=%d | errors=%d | query_elapsed_ms=%d",
        run_id, client_firm, total_responses,
        len(prompts) * len(providers), total_mentions,
        review_items, len(errors), query_elapsed,
    )

    # 4. Compute scores
    scoring_start = time.time()
    all_responses = (
        db.table("monitoring_responses")
        .select("firms_mentioned, platform, prompt_id, citations")
        .eq("run_id", run_id)
        .execute()
    )

    client_mentions = []
    all_competitor_mentions = {}
    total_prompt_count = len(prompts) * len(providers)

    perplexity_responses = []
    for resp in all_responses.data or []:
        if resp["platform"] == "perplexity":
            perplexity_responses.append(resp)
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

    score_data = compute_visibility_score(
        client_mentions,
        total_prompt_count,
        perplexity_responses=perplexity_responses,
        client=client,
        registry=registry,
    )

    for platform in providers:
        platform_prompts = len(prompts)
        platform_score = compute_visibility_score(client_mentions, platform_prompts, platform=platform)
        score_data[f"{platform}_score"] = platform_score["overall_score"]

    competitor_scores = {}
    for comp_name, comp_mentions in all_competitor_mentions.items():
        comp_score = compute_visibility_score(comp_mentions, total_prompt_count)
        competitor_scores[comp_name] = comp_score["overall_score"]
    score_data["competitor_scores"] = competitor_scores

    scoring_elapsed = int((time.time() - scoring_start) * 1000)
    logger.info(
        "Scoring completed | run_id=%s | client=%s | overall_score=%s | "
        "client_mentions=%d | competitors=%d | scoring_elapsed_ms=%d",
        run_id, client_firm, score_data.get("overall_score"),
        len(client_mentions), len(competitor_scores), scoring_elapsed,
    )

    # 5. Store visibility score
    score_data["score_components"] = build_db_score_components(score_data)

    db.table("visibility_scores").upsert({
        "client_id": client_id,
        "run_id": run_id,
        "week_date": date.today().isoformat(),
        **score_data,
    }, on_conflict="client_id,week_date").execute()

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

    client_elapsed = int((time.time() - client_start) * 1000)
    logger.info(
        "Pipeline complete for %s | run_id=%s | score=%s | mentions=%d | "
        "reviews=%d | errors=%d | client_elapsed_ms=%d",
        client_firm, run_id, score_data["overall_score"],
        total_mentions, review_items, len(errors), client_elapsed,
    )

    # 7. Content pipeline — citation matching every week, generation on content weeks
    try:
        _run_content_pipeline(
            db, client, run_id,
            all_responses.data or [],
            prompts,
            registry,
        )
    except Exception as e:
        logger.error(f"Content pipeline failed for {client_firm}: {e}", exc_info=True)

    # 8. Generate PDF report + send email
    _deliver_report(db, client, score_data, run_id)


def _is_content_week(today: date | None = None) -> bool:
    """Return True on the 1st and 15th of every month (content generation days)."""
    today = today or date.today()
    return today.day in (1, 15)


def _run_content_pipeline(
    db,
    client: dict,
    run_id: str,
    responses: list[dict],
    prompts: list[dict],
    registry: list[dict],
) -> None:
    """Run content gap detection, generation, and citation matching.

    Citation matching runs every week.
    Content generation runs only on content weeks (1st and 15th).
    Never raises — all errors are logged so the main pipeline continues.
    """
    content_start = time.time()
    client_id   = client["id"]
    client_firm = client["firm_name"]

    logger.info("Content pipeline starting | client=%s | run_id=%s", client_firm, run_id)

    # ── Citation matching (every week) ────────────────────────────────────────
    published_result = (
        db.table("content_drafts")
        .select("id, published_url, first_cited_at")
        .eq("client_id", client_id)
        .eq("status", "published")
        .execute()
    )
    published = [r for r in (published_result.data or []) if r.get("published_url")]
    perplexity_responses = [r for r in responses if r.get("platform") == "perplexity"]

    if published:
        cite_start = time.time()
        cite_result = match_citations(published, perplexity_responses, db, client_id)
        cite_elapsed = int((time.time() - cite_start) * 1000)
        logger.info(
            "Citation matching completed | client=%s | checked=%d | "
            "new_citations=%d | elapsed_ms=%d",
            client_firm, cite_result["urls_checked"],
            cite_result["new_citations"], cite_elapsed,
        )
    else:
        logger.info("No published content to match citations for | client=%s", client_firm)

    # ── Content generation (content weeks only) ───────────────────────────────
    if not _is_content_week():
        logger.info("Not a content week — skipping content generation | client=%s", client_firm)
        return

    if not settings.anthropic_api_key:
        logger.warning(
            "ANTHROPIC_API_KEY not set — skipping content generation | client=%s", client_firm
        )
        return

    gaps = detect_gaps(responses, prompts, client_firm, registry)
    if not gaps:
        logger.info("No content gaps detected | client=%s", client_firm)
        return

    logger.info(
        "Content gaps detected | client=%s | gap_count=%d | generating top 2",
        client_firm, len(gaps),
    )

    for gap_idx, gap in enumerate(gaps[:2]):
        try:
            gap_start = time.time()
            brief       = generate_brief(gap, client)
            draft_data  = generate_draft(brief, client)
            compliance  = scan_compliance(draft_data["html"], client_firm)
            package_html = assemble_package(brief, draft_data, compliance, client)

            status = "needs_review" if compliance["high_severity_count"] > 0 else "draft"

            db.table("content_drafts").insert({
                "client_id":        client_id,
                "run_id":           run_id,
                "gap_opportunity":  gap,
                "brief":            brief,
                "html":             draft_data["html"],
                "package_html":     package_html,
                "word_count":       draft_data["word_count"],
                "firm_name_count":  draft_data["firm_name_count"],
                "compliance_result": compliance,
                "status":           status,
            }).execute()

            gap_elapsed = int((time.time() - gap_start) * 1000)
            logger.info(
                "Content draft stored | client=%s | gap=%d/%d | "
                "title=%s | status=%s | word_count=%d | elapsed_ms=%d",
                client_firm, gap_idx + 1, min(2, len(gaps)),
                brief["title"][:60], status,
                draft_data["word_count"], gap_elapsed,
            )

        except Exception as e:
            logger.error(
                "Content generation failed | client=%s | gap=%d/%d | "
                "prompt=%s | error=%s",
                client_firm, gap_idx + 1, min(2, len(gaps)),
                gap["prompt_text"][:60], e,
                exc_info=True,
            )

    content_elapsed = int((time.time() - content_start) * 1000)
    logger.info(
        "Content pipeline completed | client=%s | total_elapsed_ms=%d",
        client_firm, content_elapsed,
    )


def _deliver_report(db, client: dict, score_data: dict, run_id: str):
    """Render PDF report and send email. Logs errors but does not raise."""
    client_id = client["id"]
    client_firm = client["firm_name"]
    contact_email = client.get("contact_email")
    week_date = date.today().isoformat()
    pdf_path = None  # must be initialized before try so finally can safely reference it

    if not contact_email:
        logger.warning("No contact_email for %s — skipping email delivery", client_firm)
        return

    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email delivery")
        return

    try:
        delivery_start = time.time()
        logger.info(
            "Report delivery starting | client=%s | score=%s | to=%s",
            client_firm, score_data.get("overall_score"), contact_email,
        )

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
        env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)
        digest_template = env.get_template("weekly_digest.html")
        email_html = digest_template.render(
            client=client,
            score=score_data,
            previous_score=previous_score,
            week_date=week_date,
            dashboard_url=f"https://app.legalsignal.com/dashboard?client={client['id']}",
        )

        # Render PDF to a temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            pdf_path = tmp.name

        pdf_start = time.time()
        render_report(
            client=client,
            score=score_data,
            previous_score=previous_score,
            competitors=competitors,
            week_date=week_date,
            output_path=pdf_path,
            source_signal=score_data.get("score_components", {}).get("source_signal"),
        )
        pdf_elapsed = int((time.time() - pdf_start) * 1000)
        logger.info("PDF rendered | client=%s | pdf_elapsed_ms=%d", client_firm, pdf_elapsed)

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

        delivery_elapsed = int((time.time() - delivery_start) * 1000)
        logger.info(
            "Report delivered | client=%s | to=%s | delivery_elapsed_ms=%d",
            client_firm, contact_email, delivery_elapsed,
        )

    except Exception as e:
        logger.error(
            "Report delivery failed | client=%s | to=%s | error=%s",
            client_firm, contact_email, e,
            exc_info=True,
        )
    finally:
        if pdf_path:
            try:
                Path(pdf_path).unlink(missing_ok=True)
            except Exception:
                pass
