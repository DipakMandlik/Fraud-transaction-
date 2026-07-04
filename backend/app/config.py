from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Fraud Detection Platform"
    ENV: str = "development"

    DATABASE_URL: str = "postgresql+psycopg2://fraud:fraud@localhost:5432/frauddb"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin"

    # Secondary demo analyst account. Seeded only when SEED_DEMO_ANALYST is true
    # (kept on for local/demo convenience; turn OFF for any public deployment so
    # the repo-visible default password is not a live login).
    SEED_DEMO_ANALYST: bool = True
    ANALYST_USERNAME: str = "analyst"
    ANALYST_PASSWORD: str = "analyst123"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    TXN_MIN_INTERVAL_SECONDS: int = 2
    TXN_MAX_INTERVAL_SECONDS: int = 5
    FRAUD_INJECTION_MIN_SECONDS: int = 30
    FRAUD_INJECTION_MAX_SECONDS: int = 60
    FRAUD_RATIO: float = 0.10

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
