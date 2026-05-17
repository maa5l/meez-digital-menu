from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def audit_log(
    logger: logging.Logger,
    *,
    action: str,
    user_id: str | None,
    entity_type: str,
    entity_id: str | None = None,
    extra: dict | None = None,
) -> None:
    payload = {
        "event": "audit",
        "action": action,
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **(extra or {}),
    }
    logger.info(payload)
