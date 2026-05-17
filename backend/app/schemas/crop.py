from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import EntityStatus
from app.schemas.common import TimestampSchema


class CropCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    name_en: str | None = Field(None, max_length=200)
    type: str | None = Field(None, max_length=120)
    season: str | None = Field(None, max_length=120)
    country: str | None = Field(None, max_length=120)
    country_en: str | None = Field(None, max_length=120)
    process: str | None = Field(None, max_length=120)
    process_en: str | None = Field(None, max_length=120)
    variety: str | None = Field(None, max_length=120)
    altitude: str | None = Field(None, max_length=80)
    notes: str | None = Field(None, max_length=5000)
    notes_en: str | None = Field(None, max_length=5000)
    image_id: UUID | None = None
    status: EntityStatus = EntityStatus.active


class CropUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    name_en: str | None = None
    type: str | None = None
    season: str | None = None
    country: str | None = None
    country_en: str | None = None
    process: str | None = None
    process_en: str | None = None
    variety: str | None = None
    altitude: str | None = None
    notes: str | None = None
    notes_en: str | None = None
    image_id: UUID | None = None
    status: EntityStatus | None = None


class CropOut(TimestampSchema):
    id: UUID
    venue_id: UUID
    name: str
    name_en: str | None
    type: str | None
    season: str | None
    country: str | None
    country_en: str | None
    process: str | None
    process_en: str | None
    variety: str | None
    altitude: str | None
    notes: str | None
    notes_en: str | None
    image_id: UUID | None
    image_url: str | None = None
    status: EntityStatus
