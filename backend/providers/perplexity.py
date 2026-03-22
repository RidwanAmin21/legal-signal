import logging
import requests
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .base import BaseProvider, ProviderResult
from config.settings import settings

logger = logging.getLogger(__name__)


class PerplexityProvider(BaseProvider):
    name = "perplexity"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=retry_if_exception_type(requests.exceptions.RequestException),
        before_sleep=lambda retry_state: logger.warning(
            f"Perplexity request failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        if not settings.perplexity_api_key:
            raise ValueError("PERPLEXITY_API_KEY is not set")

        start = time.time()
        payload = {
            "model": "sonar-pro",
            "messages": [{"role": "user", "content": prompt_text}],
            "web_search_options": {
                "search_context_size": "high",
                "user_location": {
                    "latitude": geo_config.get("latitude", 32.7767),
                    "longitude": geo_config.get("longitude", -96.797),
                    "country": geo_config.get("country", "US"),
                },
            },
        }
        resp = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.perplexity_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=45,
        )
        latency = int((time.time() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()

        raw_text = data["choices"][0]["message"]["content"] or ""
        citations = [
            {"url": url, "position": i}
            for i, url in enumerate(data.get("citations", []))
        ]

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=raw_text,
            citations=citations,
            latency_ms=latency,
            model="sonar-pro",
        )
