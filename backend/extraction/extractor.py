import json
import re
import openai
from config.settings import settings

EXTRACTION_PROMPT = """You are a structured data extractor. Given an AI response about lawyers/law firms, extract every firm or attorney mentioned.

Return ONLY valid JSON — no markdown, no explanation. Return an array of objects:
[
  {
    "firm_name": "exact name as mentioned in the text",
    "position": 1,
    "sentiment": "positive" | "neutral" | "negative",
    "description": "brief summary of what was said about this firm (1 sentence max)"
  }
]

If no firms are mentioned, return an empty array: []

Known firms in this market (use these for reference, but also extract any OTHER firms mentioned):
{known_firms}

AI Response to extract from:
{response_text}"""


def extract_mentions(response_text: str, known_firms: list[str]) -> list[dict]:
    """Extract firm mentions from an AI response using GPT-4o-mini."""
    if not response_text or not response_text.strip():
        return []

    if not settings.openai_api_key:
        from .regex_fallback import regex_extract
        return regex_extract(response_text, known_firms)

    client = openai.OpenAI(api_key=settings.openai_api_key)

    try:
        result = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": EXTRACTION_PROMPT.format(
                    known_firms=", ".join(known_firms) if known_firms else "none",
                    response_text=response_text,
                ),
            }],
            temperature=0,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = (result.choices[0].message.content or "[]").strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0]

        parsed = json.loads(content)

        if isinstance(parsed, dict):
            parsed = parsed.get("firms", parsed.get("mentions", parsed.get("results", [])))
        if not isinstance(parsed, list):
            parsed = []

        return parsed

    except (json.JSONDecodeError, openai.APIError):
        from .regex_fallback import regex_extract
        return regex_extract(response_text, known_firms)
