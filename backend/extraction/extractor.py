import json
import logging
import time
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
        logger.debug("Skipping extraction — empty response text")
        return []

    if not settings.openai_api_key:
        logger.info(
            "OpenAI key not set — using regex fallback | response_len=%d | known_firms=%d",
            len(response_text), len(known_firms),
        )
        from .regex_fallback import regex_extract
        return regex_extract(response_text, known_firms)

    logger.info(
        "Extraction starting | model=gpt-4o-mini | response_len=%d | known_firms=%d",
        len(response_text), len(known_firms),
    )

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
        start = time.time()
        result = _call()
        latency_ms = int((time.time() - start) * 1000)

        content = (result.choices[0].message.content or "{}").strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0]

        parsed = json.loads(content)

        if isinstance(parsed, dict):
            parsed = parsed.get("firms", [])
        if not isinstance(parsed, list):
            parsed = []

        usage = result.usage
        logger.info(
            "Extraction completed | latency_ms=%d | firms_found=%d | "
            "prompt_tokens=%s | completion_tokens=%s",
            latency_ms, len(parsed),
            usage.prompt_tokens if usage else "n/a",
            usage.completion_tokens if usage else "n/a",
        )

        return parsed

    except (json.JSONDecodeError, openai.APIError) as e:
        logger.warning(
            "Extraction failed — falling back to regex | error=%s | response_len=%d",
            e, len(response_text),
        )
        from .regex_fallback import regex_extract
        return regex_extract(response_text, known_firms)
