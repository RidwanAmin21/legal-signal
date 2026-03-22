from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATE_DIR = Path(__file__).parent / "templates"


def render_report(
    client: dict,
    score: dict,
    previous_score: dict | None,
    competitors: list[dict],
    week_date: str,
    output_path: str,
) -> str:
    """Generate a PDF report and return the file path."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("weekly_report.html")

    html_content = template.render(
        client=client,
        score=score,
        previous_score=previous_score,
        competitors=competitors,
        week_date=week_date,
    )

    HTML(string=html_content).write_pdf(output_path)
    return output_path
