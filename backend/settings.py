"""Application-wide configuration helpers."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Root directory for the backend package
BASE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    """Centralised configuration derived from environment variables."""

    api_title: str = "Virtual Teaching Assistant API"
    api_description: str = "RAG-based Q&A API for course materials"
    api_version: str = "1.0.0"

    allowed_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:3001",
        ]
    )

    data_dir: Path = Field(default_factory=lambda: BASE_DIR / "data")
    index_dir: Path = Field(default_factory=lambda: BASE_DIR / "index")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="VTA_",
        env_nested_delimiter="__",
        extra="allow",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: str | List[str]) -> List[str]:  # noqa: D401
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("data_dir", "index_dir", mode="after")
    @classmethod
    def _expand_path(cls, value: Path) -> Path:
        return value.expanduser().resolve()

    def ensure_directories(self) -> None:
        """Create expected filesystem directories when missing."""
        for directory in (self.data_dir, self.index_dir):
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached accessor so FastAPI dependencies stay lightweight."""
    return Settings()


def reset_settings_cache() -> None:
    """Utility for tests to re-load configuration from the environment."""
    get_settings.cache_clear()  # type: ignore[attr-defined]
