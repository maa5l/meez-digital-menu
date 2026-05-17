from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class PaginatedMeta(BaseModel):
    page: int
    page_size: int
    total: int
    pages: int


class MessageResponse(BaseModel):
    message: str


class TimestampSchema(ORMModel):
    created_at: datetime
    updated_at: datetime | None = None
