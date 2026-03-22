import base64
import re
import resend
from pathlib import Path
from config.settings import settings


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
    # Set API key inside the function to avoid module-level side effects
    resend.api_key = settings.resend_api_key
    if not resend.api_key:
        raise ValueError("RESEND_API_KEY is not configured")

    pdf_bytes = Path(pdf_path).read_bytes()
    filename = f"legalsignal-report-{_safe_filename(firm_name)}.pdf"

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

    return resend.Emails.send(params)
