import openai
import time
from .base import BaseProvider, ProviderResult

from config.settings import settings


class OpenAIProvider(BaseProvider):
    name = "chatgpt"

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set")

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

        return ProviderResult(
            provider=self.name,
            prompt_id="",
            raw_text=response.choices[0].message.content or "",
            citations=[],
            latency_ms=latency,
            model="gpt-4o",
        )
