import resend
from pathlib import Path
from config.settings import settings

resend.api_key = settings.resend_api_key


def send_weekly_report(
    to_email: str,
    firm_name: str,
    score: int,
    pdf_path: str,
    html_content: str,
) -> dict:
    """Send the weekly report email with PDF attachment."""
    pdf_bytes = Path(pdf_path).read_bytes()

    params = {
        "from": settings.from_email,
        "to": [to_email],
        "subject": f"LegalSignal Weekly Report — {firm_name} (Score: {score}/100)",
        "html": html_content,
        "attachments": [{
            "filename": f"legalsignal-report-{firm_name.lower().replace(' ', '-')}.pdf",
            "content": list(pdf_bytes),  # Resend expects a list of integers
        }],
    }

    return resend.Emails.send(params)
