import requests
import time
from .base import BaseProvider, ProviderResult

from config.settings import settings


class PerplexityProvider(BaseProvider):
    name = "perplexity"

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
