from pathlib import Path

from pydantic_settings import BaseSettings

# Load .env from backend/ or project root
_env = Path(__file__).resolve().parent.parent / ".env"
_env_root = _env.parent.parent / ".env"
_env_file = _env if _env.exists() else _env_root


class Settings(BaseSettings):
    # API keys — use empty string to skip a provider
    perplexity_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""
    anthropic_api_key: str = ""

    # Supabase (optional for scraper-only runs)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Email
    resend_api_key: str = ""
    from_email: str = "reports@legalsignal.com"

    # App
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = str(_env_file) if _env_file.exists() else ".env"
        env_file_encoding = "utf-8"


settings = Settings()
