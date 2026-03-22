import json
import logging
import openai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from config.settings import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are a structured data extractor. Given an AI response about lawyers/law firms, extract every firm or attorney mentioned.

Return ONLY valid JSON — no markdown, no explanation. Return an object with a "firms" key containing an array:
{{
  "firms": [
    {{
      "firm_name": "exact name as mentioned in the text",
      "position": 1,
      "sentiment": "positive" | "neutral" | "negative",
      "description": "brief summary of what was said about this firm (1 sentence max)"
    }}
  ]
}}

If no firms are mentioned, return: {{"firms": []}}

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

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((openai.APIError, openai.RateLimitError)),
        before_sleep=lambda retry_state: logger.warning(
            f"Extraction API call failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def _call():
        return client.chat.completions.create(
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

    try:
        result = _call()

        content = (result.choices[0].message.content or "{}").strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0]

        parsed = json.loads(content)

        # Prompt requests {"firms": [...]} — key is now deterministic
        if isinstance(parsed, dict):
            parsed = parsed.get("firms", [])
        if not isinstance(parsed, list):
            parsed = []

        return parsed

    except (json.JSONDecodeError, openai.APIError) as e:
        logger.warning(f"Extraction failed, falling back to regex: {e}")
        from .regex_fallback import regex_extract
        return regex_extract(response_text, known_firms)
