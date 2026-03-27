"""Package assembler — no API calls.

Assembles the complete content deliverable for the client into a single HTML
document that can be rendered as a PDF or displayed in the dashboard content
section. Includes:

  - Metadata table (URL slug, word count, schema type, etc.)
  - Publishing checklist
  - FAQPage JSON-LD schema block (ready to paste into <head>)
  - Compliance scan results (flags surfaced as attorney-review notes)
  - Full article HTML
"""
from __future__ import annotations
import html
import json
import re

try:
    import bleach
    _ALLOWED_TAGS = [
        "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
        "ul", "ol", "li", "strong", "em", "b", "i", "a",
        "table", "thead", "tbody", "tr", "th", "td",
        "blockquote", "code", "pre", "span", "div", "sub", "sup",
    ]
    _ALLOWED_ATTRS = {"a": ["href", "title"], "td": ["colspan", "rowspan"], "th": ["colspan", "rowspan"]}

    def _sanitize_article_html(raw_html: str) -> str:
        return bleach.clean(raw_html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)
except ImportError:
    _SCRIPT_RE = re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)
    _EVENT_RE = re.compile(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', re.IGNORECASE)

    def _sanitize_article_html(raw_html: str) -> str:
        cleaned = _SCRIPT_RE.sub("", raw_html)
        cleaned = _EVENT_RE.sub("", cleaned)
        return cleaned


# ── FAQ answer extraction ─────────────────────────────────────────────────────

_H3_RE = re.compile(r"<h3[^>]*>(.*?)</h3>\s*(.*?)(?=<h[123]|$)", re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")


def _extract_faq_pairs(html: str, brief_questions: list[str]) -> list[dict]:
    """Extract Q&A pairs from the article HTML for FAQPage schema.

    Tries to find the answer text for each h3 (FAQ question). Falls back
    to a placeholder if the HTML structure doesn't match expectations.
    """
    pairs: list[dict] = []
    for m in _H3_RE.finditer(html):
        question = _TAG_RE.sub("", m.group(1)).strip()
        answer_html = m.group(2).strip()
        # Take the first <p> worth of text as the answer
        p_match = re.search(r"<p[^>]*>(.*?)</p>", answer_html, re.IGNORECASE | re.DOTALL)
        answer_text = _TAG_RE.sub("", p_match.group(1)).strip() if p_match else _TAG_RE.sub("", answer_html[:400]).strip()
        if question:
            pairs.append({"question": question, "answer": answer_text or "[See article for full answer]"})

    # If extraction yielded nothing, fall back to brief questions with placeholder answers
    if not pairs:
        for q in (brief_questions or []):
            pairs.append({"question": q, "answer": "[Attorney to verify answer before publishing]"})

    return pairs


# ── Schema builder ────────────────────────────────────────────────────────────

def _build_faq_schema(pairs: list[dict]) -> str:
    schema = {
        "@context": "https://schema.org",
        "@type":    "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name":  p["question"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text":  p["answer"],
                },
            }
            for p in pairs
        ],
    }
    return json.dumps(schema, indent=2, ensure_ascii=False)


# ── Compliance HTML ───────────────────────────────────────────────────────────

def _compliance_section(compliance: dict) -> str:
    if not compliance.get("flags"):
        return ""

    status_cls  = "passed" if compliance["passed"] else "failed"
    status_icon = "&#10003; Automated check passed" if compliance["passed"] else "&#9888; Attorney review required before publishing"

    items = "".join(
        f'<li class="flag-item flag-{html.escape(str(f["severity"]))}">'
        f'<strong>[{html.escape(str(f["severity"]).upper())}] {html.escape(str(f["type"]).replace("_", " ").title())}</strong>: '
        f'{html.escape(str(f["text"]))} <em>({html.escape(str(f["location"]))})</em>'
        f"</li>"
        for f in compliance["flags"]
    )

    return f"""
<div class="section compliance-section">
  <h2 class="section-title">Compliance Review Notes</h2>
  <p class="compliance-status {status_cls}">{status_icon}</p>
  <ul class="flag-list">{items}</ul>
  <p class="compliance-note">{html.escape(str(compliance.get("recommendation", "")))}</p>
</div>"""


# ── Main function ─────────────────────────────────────────────────────────────

def assemble_package(
    brief:      dict,
    draft:      dict,
    compliance: dict,
    client:     dict,
) -> str:
    """Assemble the full content deliverable as an HTML document.

    Args:
        brief:      Output of generate_brief().
        draft:      Output of generate_draft().
        compliance: Output of scan_compliance().
        client:     Client row from the clients table.

    Returns:
        Single HTML string. Store in content_drafts.package_html.
    """
    firm_name   = html.escape(str(client.get("firm_name", "")))
    url_slug    = html.escape(str(brief.get("recommended_url_slug", "/blog/article")))
    title       = html.escape(str(brief.get("title", "")))
    seo_title   = html.escape(str(brief.get("seo_title", "")))
    meta_desc   = html.escape(str(brief.get("meta_description", "")))
    word_target = html.escape(str(brief.get("word_count_target", "—")))
    schema_type = html.escape(str(brief.get("schema_type", "FAQPage")))

    faq_pairs   = _extract_faq_pairs(draft.get("html", ""), brief.get("faq_questions"))
    schema_json = _build_faq_schema(faq_pairs)

    # url_slug, seo_title, meta_desc are already escaped above
    checklist_items = [
        f"Publish at: <code>{url_slug}</code>",
        f"Page title (title tag): <em>{seo_title}</em>",
        f"Meta description: <em>{meta_desc}</em>",
        "Copy the FAQPage JSON-LD block below and paste it inside the "
        "<code>&lt;head&gt;</code> of the published page.",
        "Have an attorney review the article for legal accuracy before publishing.",
        "After publishing, add the live URL to your LegalSignal dashboard "
        "to begin tracking AI citation performance.",
    ]
    checklist_html = "".join(f"<li>{item}</li>" for item in checklist_items)

    statutes = draft.get("statutes_cited") or []
    entities = draft.get("local_entities_used") or []
    stat_row = f"<tr><td>Statutes cited</td><td>{html.escape(', '.join(str(s) for s in statutes)) or '—'}</td></tr>" if statutes else ""
    ent_row  = f"<tr><td>Local entities used</td><td>{html.escape(', '.join(str(e) for e in entities)) or '—'}</td></tr>" if entities else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Content Package: {title}</title>
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12px; color: #1c1917;
      max-width: 820px; margin: 0 auto; padding: 36px 28px;
      line-height: 1.6;
    }}
    .page-title {{
      font-size: 20px; font-weight: bold;
      border-bottom: 2px solid #1c1917;
      padding-bottom: 10px; margin-bottom: 20px;
    }}
    .section {{ margin-bottom: 28px; }}
    .section-title {{
      font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px;
      color: #78716c; border-bottom: 1px solid #e7e5e4;
      padding-bottom: 4px; margin-bottom: 12px;
    }}
    .meta-table {{ width: 100%; border-collapse: collapse; font-size: 11px; }}
    .meta-table td {{ padding: 5px 8px; border-bottom: 1px solid #f0efee; }}
    .meta-table td:first-child {{ font-weight: bold; color: #57534e; width: 160px; }}
    .checklist {{ padding-left: 20px; }}
    .checklist li {{ margin-bottom: 7px; }}
    .schema-wrapper {{
      background: #f5f5f4; border: 1px solid #e7e5e4;
      border-radius: 4px; padding: 12px; overflow: hidden;
    }}
    .schema-wrapper pre {{
      font-family: "Courier New", monospace; font-size: 10px;
      white-space: pre-wrap; word-break: break-all; color: #1c1917;
    }}
    .compliance-section {{
      border: 1px solid #fbbf24; background: #fffbeb;
      border-radius: 4px; padding: 14px;
    }}
    .compliance-status {{ font-weight: bold; margin-bottom: 8px; font-size: 11px; }}
    .compliance-status.passed {{ color: #166534; }}
    .compliance-status.failed {{ color: #991b1b; }}
    .flag-list {{ padding-left: 18px; margin-top: 8px; }}
    .flag-item {{ margin-bottom: 6px; font-size: 11px; }}
    .flag-high   {{ color: #991b1b; }}
    .flag-medium {{ color: #92400e; }}
    .flag-low    {{ color: #57534e; }}
    .compliance-note {{ font-size: 10px; color: #78716c; margin-top: 10px; font-style: italic; }}
    .article-wrapper {{
      border: 1px solid #e7e5e4; border-radius: 4px;
      padding: 24px; background: #fafaf9;
    }}
    .article-wrapper h1 {{ font-size: 20px; margin-bottom: 14px; line-height: 1.3; }}
    .article-wrapper h2 {{ font-size: 15px; margin: 18px 0 8px; }}
    .article-wrapper h3 {{ font-size: 13px; margin: 14px 0 6px; }}
    .article-wrapper p  {{ margin-bottom: 10px; }}
    .article-wrapper ul, .article-wrapper ol {{ padding-left: 20px; margin-bottom: 10px; }}
    .article-wrapper li {{ margin-bottom: 4px; }}
    code {{
      background: #f0efee; padding: 1px 5px;
      border-radius: 3px; font-size: 10px; font-family: monospace;
    }}
  </style>
</head>
<body>

<div class="page-title">Content Package: {title}</div>

<!-- ── Metadata ── -->
<div class="section">
  <div class="section-title">Overview</div>
  <table class="meta-table">
    <tr><td>Firm</td><td>{firm_name}</td></tr>
    <tr><td>Target prompt</td><td>{html.escape(str(brief.get("target_prompt", "—")))}</td></tr>
    <tr><td>Recommended URL</td><td><code>{url_slug}</code></td></tr>
    <tr><td>Schema type</td><td>{schema_type}</td></tr>
    <tr><td>Word count</td><td>{html.escape(str(draft.get("word_count", "—")))} (target: {word_target})</td></tr>
    <tr><td>Firm name mentions</td><td>{html.escape(str(draft.get("firm_name_count", "—")))} (target: 2–3)</td></tr>
    <tr><td>FAQ questions</td><td>{html.escape(str(draft.get("faq_count", "—")))}</td></tr>
    {stat_row}
    {ent_row}
  </table>
</div>

<!-- ── Publishing checklist ── -->
<div class="section">
  <div class="section-title">Publishing Checklist</div>
  <ol class="checklist">{checklist_html}</ol>
</div>

<!-- ── FAQPage schema ── -->
<div class="section">
  <div class="section-title">FAQPage JSON-LD Schema (paste into &lt;head&gt;)</div>
  <div class="schema-wrapper">
    <pre><script type="application/ld+json">
{schema_json}
</script></pre>
  </div>
</div>

<!-- ── Compliance ── -->
{_compliance_section(compliance)}

<!-- ── Article ── -->
<div class="section">
  <div class="section-title">Article Content</div>
  <div class="article-wrapper">
    {_sanitize_article_html(draft.get("html", ""))}
  </div>
</div>

</body>
</html>"""
