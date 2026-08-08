"""Application configuration via Pydantic Settings."""
from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "EcoRal"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    # Database
    database_url: str = (
        "postgresql+asyncpg://ecoral:password@localhost:5432/ecoral"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "dev-secret-change-in-production-minimum-32-chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v  # type: ignore[return-value]

    @model_validator(mode="after")
    def validate_production_secrets(self) -> Settings:
        if self.app_env == "production":
            if "dev-secret" in self.jwt_secret_key or len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY must be configured with a secure random secret of at least 32 characters in production."
                )
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
