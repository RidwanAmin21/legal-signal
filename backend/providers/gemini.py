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

        localized_prompt = (
            f"I am located in {geo_config.get('city', 'Dallas')}, "
            f"{geo_config.get('state', 'TX')}. {prompt_text}"
        )
        start = time.time()
        raw_text = ""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=localized_prompt,
            )
            raw_text = response.text or ""
        except ValueError as e:
            # Gemini safety block — not retryable, treat as empty response
            logger.warning(f"Gemini returned no content (safety block or filter): {e}")
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise  # let tenacity retry this

        latency = int((time.time() - start) * 1000)

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=raw_text,
            citations=[],
            latency_ms=latency,
            model="gemini-2.0-flash",
        )
