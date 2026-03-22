"""Pipeline integration tests. DB tests require Supabase + seeded data to run."""
import pytest

from scoring.scorer import compute_visibility_score


def test_scoring_with_realistic_mention_data():
    """Verify scoring produces valid output for realistic multi-platform mention data."""
    mentions = [
        {"prompt_id": "p1", "position": 1, "sentiment": "positive", "platform": "chatgpt"},
        {"prompt_id": "p2", "position": 2, "sentiment": "neutral", "platform": "perplexity"},
        {"prompt_id": "p1", "position": 3, "sentiment": "positive", "platform": "gemini"},
    ]
    result = compute_visibility_score(mentions, total_prompts=10)
    assert 0 <= result["overall_score"] <= 100
    assert result["mention_rate"] == 0.2  # 2 unique prompts / 10
    assert "score_components" in result
    assert result["score_components"]["mention"]["contribution"] == 10.0  # 0.2 * 50


def test_scoring_deduplicates_first_position():
    """Verify duplicate position=1 mentions for same (prompt_id, platform) don't inflate score."""
    mentions = [
        {"prompt_id": "p1", "position": 1, "sentiment": "positive", "platform": "chatgpt"},
        {"prompt_id": "p1", "position": 1, "sentiment": "positive", "platform": "chatgpt"},  # duplicate
    ]
    result = compute_visibility_score(mentions, total_prompts=5)
    # first_position_prompts = {("p1", "chatgpt")} → 1 unique, total_mentions=2
    assert result["first_position_rate"] == 0.5  # 1 unique / 2 total


# ── DB integration tests (skipped when env vars not set) ────────────────────

def _get_skip_marker():
    try:
        from config.settings import settings
        missing = not settings.supabase_url or not settings.supabase_service_role_key
    except Exception:
        missing = True
    return pytest.mark.skipif(missing, reason="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set")


skip_no_db = _get_skip_marker()


@skip_no_db
def test_pipeline_db_connection():
    """Verify the pipeline can connect to Supabase and read clients."""
    from db.connection import get_supabase
    db = get_supabase()
    result = db.table("clients").select("id").limit(1).execute()
    assert isinstance(result.data, list)


@skip_no_db
def test_pipeline_prompts_exist():
    """Verify prompts are seeded for the default metro."""
    from db.connection import get_supabase
    db = get_supabase()
    result = db.table("prompts").select("id").eq("metro", "dallas").limit(1).execute()
    assert len(result.data) > 0, "No prompts found — run: python main.py seed-prompts"


@skip_no_db
def test_pipeline_registry_exists():
    """Verify firm registry is seeded for the default market."""
    from db.connection import get_supabase
    db = get_supabase()
    result = db.table("firm_registry").select("id").eq("market", "dallas_pi").limit(1).execute()
    assert len(result.data) > 0, "No registry entries — run: python main.py seed-registry --market dallas_pi"
