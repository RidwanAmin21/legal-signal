import logging
import openai
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .base import BaseProvider, ProviderResult
from config.settings import settings

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    name = "chatgpt"

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=retry_if_exception_type((openai.APIError, openai.RateLimitError)),
        before_sleep=lambda retry_state: logger.warning(
            f"OpenAI request failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set")

        logger.info(
            "OpenAI API call starting | model=gpt-4o | prompt_len=%d | geo=%s,%s",
            len(prompt_text),
            geo_config.get("city", "Dallas"),
            geo_config.get("state", "TX"),
        )

        start = time.time()
        localized_prompt = (
            f"I am located in {geo_config.get('city', 'Dallas')}, "
            f"{geo_config.get('state', 'TX')}. {prompt_text}"
        )

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": localized_prompt}],
            temperature=0,
            max_tokens=2000,
        )
        latency = int((time.time() - start) * 1000)

        raw_text = response.choices[0].message.content or ""
        usage = response.usage

        logger.info(
            "OpenAI API call completed | latency_ms=%d | response_len=%d | "
            "prompt_tokens=%s | completion_tokens=%s | total_tokens=%s",
            latency, len(raw_text),
            usage.prompt_tokens if usage else "n/a",
            usage.completion_tokens if usage else "n/a",
            usage.total_tokens if usage else "n/a",
        )

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=raw_text,
            citations=[],
            latency_ms=latency,
            model="gpt-4o",
        )
