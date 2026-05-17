from __future__ import annotations

from functools import lru_cache
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Meez Menu API"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql://postgres:postgres@localhost:5432/meez_menu"
    redis_url: Optional[str] = None
    menu_cache_ttl_seconds: int = 60

    jwt_secret: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    cors_origins: str = "http://localhost:8080,http://localhost:8081"

    storage_backend: Literal["local", "s3"] = "local"
    local_upload_dir: str = "uploads"
    public_base_url: str = "http://localhost:8000"

    s3_bucket: Optional[str] = None
    s3_region: str = "auto"
    s3_endpoint_url: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_public_url_prefix: Optional[str] = None

    max_upload_bytes: int = 5 * 1024 * 1024
    allowed_image_mimes: str = "image/jpeg,image/png,image/webp,image/gif"

    rate_limit_upload: str = "20/minute"
    rate_limit_default: str = "120/minute"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_mime_set(self) -> set[str]:
        return {m.strip() for m in self.allowed_image_mimes.split(",") if m.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
