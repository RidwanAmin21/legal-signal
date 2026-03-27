import base64
import logging
import re
import time
import resend
from pathlib import Path
from config.settings import settings

logger = logging.getLogger(__name__)


def _safe_filename(name: str, max_len: int = 60) -> str:
    """Sanitize a firm name into a safe filename slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:max_len]


def send_weekly_report(
    to_email: str,
    firm_name: str,
    score: int,
    pdf_path: str,
    html_content: str,
) -> dict:
    """Send the weekly report email with PDF attachment."""
    resend.api_key = settings.resend_api_key
    if not resend.api_key:
        raise ValueError("RESEND_API_KEY is not configured")

    pdf_bytes = Path(pdf_path).read_bytes()
    pdf_size_kb = len(pdf_bytes) / 1024
    filename = f"legalsignal-report-{_safe_filename(firm_name)}.pdf"

    logger.info(
        "Sending weekly report email | to=%s | firm=%s | score=%d | "
        "pdf_size_kb=%.1f | from=%s",
        to_email, firm_name, score, pdf_size_kb, settings.from_email,
    )

    params = {
        "from": settings.from_email,
        "to": [to_email],
        "subject": f"LegalSignal Weekly Report — {firm_name} (Score: {score}/100)",
        "html": html_content,
        "attachments": [{
            "filename": filename,
            "content": base64.b64encode(pdf_bytes).decode("utf-8"),
        }],
    }

    start = time.time()
    result = resend.Emails.send(params)
    latency_ms = int((time.time() - start) * 1000)

    email_id = result.get("id", "unknown") if isinstance(result, dict) else "unknown"
    logger.info(
        "Email sent successfully | to=%s | firm=%s | email_id=%s | latency_ms=%d",
        to_email, firm_name, email_id, latency_ms,
    )

    return result
