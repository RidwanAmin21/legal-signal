from typing import TypedDict


class ProviderResult(TypedDict):
    provider: str  # "perplexity" | "chatgpt" | "gemini"
    prompt_id: str  # UUID of the prompt
    raw_text: str  # Full AI response text
    citations: list[dict]  # [{url: str, position: int}] — Perplexity only, [] for others
    latency_ms: int  # Response time in milliseconds
    model: str  # Actual model used (e.g., "sonar-pro")


class BaseProvider:
    name: str = "base"

    def query(self, prompt_text: str, geo_config: dict) -> ProviderResult:
        raise NotImplementedError
