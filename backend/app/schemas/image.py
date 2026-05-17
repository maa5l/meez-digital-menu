from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ImageType
from app.schemas.common import ORMModel


class ImageCreateMeta(BaseModel):
    alt_text: str | None = Field(None, max_length=500)
    type: ImageType = ImageType.general


class ImageOut(ORMModel):
    id: UUID
    url: str
    alt_text: str | None
    mime_type: str
    size_bytes: int
    type: ImageType
    created_at: datetime
