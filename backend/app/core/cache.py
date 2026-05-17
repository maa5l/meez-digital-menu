from __future__ import annotations

import json
from typing import Any

from app.core.config import get_settings

settings = get_settings()
_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not settings.redis_url:
        return None
    try:
        import redis

        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        _redis_client.ping()
        return _redis_client
    except Exception:
        return None


class MenuCache:
    def get(self, key: str) -> dict[str, Any] | None:
        client = _get_redis()
        if not client:
            return None
        raw = client.get(key)
        if not raw:
            return None
        return json.loads(raw)

    def set(self, key: str, value: dict[str, Any], ttl: int | None = None) -> None:
        client = _get_redis()
        if not client:
            return
        client.setex(key, ttl or settings.menu_cache_ttl_seconds, json.dumps(value))

    def delete_pattern(self, prefix: str) -> None:
        client = _get_redis()
        if not client:
            return
        for key in client.scan_iter(f"{prefix}*"):
            client.delete(key)


menu_cache = MenuCache()
