"""Tests for PDF rendering and email delivery."""
from pathlib import Path
from unittest.mock import MagicMock, patch

from reporting.pdf_renderer import render_report


def _mock_client(firm_name: str = "Test Firm & Associates") -> dict:
    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "firm_name": firm_name,
        "market_key": "dallas_pi",
        "contact_email": "test@example.com",
    }


def _mock_score() -> dict:
    return {
        "overall_score": 72,
        "mention_rate": 0.6,
        "first_position_rate": 0.3,
        "positive_sentiment_rate": 0.8,
        "chatgpt_score": 65,
        "perplexity_score": 78,
        "gemini_score": None,
        "competitor_scores": {"Rival Firm": 55, "Other Firm": 40},
        "score_components": {
            "mention":   {"raw": 0.6, "weight": 50, "contribution": 30.0},
            "position":  {"raw": 0.3, "weight": 30, "contribution": 9.0},
            "sentiment": {"raw": 0.8, "weight": 20, "contribution": 16.0},
        },
    }


def test_pdf_renders_without_crash(tmp_path):
    output = str(tmp_path / "test_report.pdf")
    render_report(
        client=_mock_client(),
        score=_mock_score(),
        previous_score=None,
        competitors=[{"name": "Rival Firm", "score": 55}],
        week_date="2026-03-22",
        output_path=output,
    )
    assert Path(output).exists()
    assert Path(output).stat().st_size > 1000


def test_pdf_renders_with_previous_score(tmp_path):
    output = str(tmp_path / "test_report_delta.pdf")
    render_report(
        client=_mock_client(),
        score=_mock_score(),
        previous_score={"overall_score": 65},
        competitors=[{"name": "Rival Firm", "score": 55}],
        week_date="2026-03-22",
        output_path=output,
    )
    assert Path(output).exists()
    assert Path(output).stat().st_size > 1000


def test_pdf_handles_empty_competitors(tmp_path):
    output = str(tmp_path / "test_report_no_comp.pdf")
    render_report(
        client=_mock_client(),
        score=_mock_score(),
        previous_score=None,
        competitors=[],
        week_date="2026-03-22",
        output_path=output,
    )
    assert Path(output).exists()


def test_pdf_handles_special_chars_in_firm_name(tmp_path):
    """Verify HTML entities in firm names don't break rendering (autoescape test)."""
    output = str(tmp_path / "test_report_special.pdf")
    render_report(
        client=_mock_client(firm_name='O\'Brien & Associates "Best" <Firm>'),
        score=_mock_score(),
        previous_score=None,
        competitors=[],
        week_date="2026-03-22",
        output_path=output,
    )
    assert Path(output).exists()


def test_pdf_handles_null_platform_scores(tmp_path):
    """Verify PDF renders when per-platform scores are None."""
    output = str(tmp_path / "test_report_null_scores.pdf")
    score = _mock_score()
    score["chatgpt_score"] = None
    score["perplexity_score"] = None
    score["gemini_score"] = None
    render_report(
        client=_mock_client(),
        score=score,
        previous_score=None,
        competitors=[],
        week_date="2026-03-22",
        output_path=output,
    )
    assert Path(output).exists()


# ── Email delivery tests (mock Resend) ───────────────────────────────────────

def test_send_weekly_report_calls_resend(tmp_path):
    """Verify send_weekly_report calls resend.Emails.send with expected fields."""
    from reporting.email_delivery import send_weekly_report

    # Create a minimal valid PDF-like file
    pdf_path = str(tmp_path / "sample.pdf")
    Path(pdf_path).write_bytes(b"%PDF-1.4 fake content")

    with patch("reporting.email_delivery.settings") as mock_settings, \
         patch("reporting.email_delivery.resend.Emails.send") as mock_send:
        mock_settings.resend_api_key = "test-key"
        mock_settings.from_email = "reports@legalsignal.com"
        mock_send.return_value = {"id": "test-email-id"}
        result = send_weekly_report(
            to_email="test@example.com",
            firm_name="Test Firm",
            score=72,
            pdf_path=pdf_path,
            html_content="<h1>Test</h1>",
        )

    mock_send.assert_called_once()
    call_kwargs = mock_send.call_args[0][0]
    assert call_kwargs["to"] == ["test@example.com"]
    assert "Test Firm" in call_kwargs["subject"]
    assert "72" in call_kwargs["subject"]
    assert len(call_kwargs["attachments"]) == 1
    attachment = call_kwargs["attachments"][0]
    assert attachment["filename"].endswith(".pdf")
    # Resend expects base64-encoded content string
    assert isinstance(attachment["content"], str)


def test_send_weekly_report_skips_when_no_api_key(tmp_path):
    """Verify send raises or returns gracefully when RESEND_API_KEY is empty."""
    from reporting.email_delivery import send_weekly_report
    import reporting.email_delivery as email_mod

    pdf_path = str(tmp_path / "sample.pdf")
    Path(pdf_path).write_bytes(b"%PDF-1.4 fake")

    original_key = email_mod.resend.api_key
    try:
        email_mod.resend.api_key = ""
        # Should raise ValueError, not crash with AttributeError
        try:
            send_weekly_report(
                to_email="test@example.com",
                firm_name="Test Firm",
                score=72,
                pdf_path=pdf_path,
                html_content="<h1>Test</h1>",
            )
        except ValueError:
            pass  # Expected
    finally:
        email_mod.resend.api_key = original_key
