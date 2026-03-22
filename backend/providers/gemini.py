import google.generativeai as genai
import time
from .base import BaseProvider, ProviderResult

from config.settings import settings


class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not set")

        localized_prompt = (
            f"I am located in {geo_config.get('city', 'Dallas')}, "
            f"{geo_config.get('state', 'TX')}. {prompt_text}"
        )
        start = time.time()

        try:
            response = self.model.generate_content(localized_prompt)
            raw_text = response.text or ""
        except ValueError:
            raw_text = ""

        latency = int((time.time() - start) * 1000)

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=raw_text,
            citations=[],
            latency_ms=latency,
            model="gemini-2.0-flash",
        )
