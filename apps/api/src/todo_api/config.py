from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # apps/api
load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True, slots=True)
class Settings:
    """Typed configuration loaded once from the environment."""

    database_url: str
    jwt_secret_key: str
    jwt_access_token_expires_hours: int = 4
    cors_origins: tuple[str, ...] = ("http://localhost:5173",)
    api_title: str = "Rest API"
    api_version: str = "v1"
    openapi_version: str = "3.0.2"

    @classmethod
    def from_env(cls) -> Settings:
        jwt_secret_key = os.getenv("JWT_SECRET_KEY")
        if not jwt_secret_key:
            if os.getenv("APP_ENV") == "test":
                jwt_secret_key = "test-secret"
            else:
                raise RuntimeError("JWT_SECRET_KEY is required")

        raw_origins = os.getenv("CORS_ORIGINS")
        cors_origins = (
            tuple(origin.strip() for origin in raw_origins.split(",") if origin.strip())
            if raw_origins
            else ("http://localhost:5173",)
        )

        return cls(
            database_url=os.getenv("DATABASE_URL") or f"sqlite:///{PROJECT_ROOT / 'data.db'}",
            jwt_secret_key=jwt_secret_key,
            cors_origins=cors_origins,
        )


__all__ = ["PROJECT_ROOT", "Settings"]
