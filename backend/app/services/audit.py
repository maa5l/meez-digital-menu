from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.logging_config import audit_log
from app.models.audit_log import AuditLog

logger = logging.getLogger("meez.audit")


def record_audit(
    db: Session,
    *,
    venue_id: UUID,
    user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    payload: dict | None = None,
) -> None:
    entry = AuditLog(
        venue_id=venue_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
    )
    db.add(entry)
    audit_log(
        logger,
        action=action,
        user_id=str(user_id) if user_id else None,
        entity_type=entity_type,
        entity_id=entity_id,
        extra=payload,
    )
