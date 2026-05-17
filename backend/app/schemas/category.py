from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel, TimestampSchema
import re


def slugify(value: str) -> str:
    s = value.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    return re.sub(r"[\s_-]+", "-", s).strip("-") or "category"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(None, max_length=120)
    parent_id: UUID | None = None
    icon: str | None = Field("✨", max_length=16)

    @model_validator(mode="after")
    def set_slug(self):
        self.slug = slugify(self.slug or self.name)
        return self


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, max_length=120)
    parent_id: UUID | None = None
    icon: str | None = Field(None, max_length=16)


class CategoryOut(TimestampSchema):
    id: UUID
    venue_id: UUID
    name: str
    slug: str
    parent_id: UUID | None
    icon: str | None
