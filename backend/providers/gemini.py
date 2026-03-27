import logging
import time
from google import genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .base import BaseProvider, ProviderResult
from config.settings import settings

logger = logging.getLogger(__name__)


class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self):
        self.client = genai.Client(api_key=settings.google_api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=retry_if_exception_type(Exception),
        before_sleep=lambda retry_state: logger.warning(
            f"Gemini request failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not set")

        logger.info(
            "Gemini API call starting | model=gemini-2.5-flash | prompt_len=%d | geo=%s,%s",
            len(prompt_text),
            geo_config.get("city", "Dallas"),
            geo_config.get("state", "TX"),
        )

        localized_prompt = (
            f"I am located in {geo_config.get('city', 'Dallas')}, "
            f"{geo_config.get('state', 'TX')}. {prompt_text}"
        )
        start = time.time()
        raw_text = ""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=localized_prompt,
            )
            raw_text = response.text or ""
        except ValueError as e:
            logger.warning(
                "Gemini returned no content (safety block or filter) | error=%s | prompt_len=%d",
                e, len(prompt_text),
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            logger.error(
                "Gemini API call failed | error=%s | latency_ms=%d | prompt_len=%d",
                e, latency, len(prompt_text),
            )
            raise  # let tenacity retry this

        latency = int((time.time() - start) * 1000)

        logger.info(
            "Gemini API call completed | latency_ms=%d | response_len=%d | empty=%s",
            latency, len(raw_text), raw_text == "",
        )

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=raw_text,
            citations=[],
            latency_ms=latency,
            model="gemini-2.5-flash",
        )
