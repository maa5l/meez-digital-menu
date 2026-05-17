from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import EntityStatus
from app.schemas.common import ORMModel, TimestampSchema


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(None, max_length=5000)
    price: Decimal = Field(ge=0)
    category_id: UUID | None = None
    image_id: UUID | None = None
    calories: int | None = Field(0, ge=0)
    allergens: str | None = Field(None, max_length=500)
    status: EntityStatus = EntityStatus.active
    extra_image_ids: list[UUID] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=5000)
    price: Decimal | None = Field(None, ge=0)
    category_id: UUID | None = None
    image_id: UUID | None = None
    calories: int | None = Field(None, ge=0)
    allergens: str | None = Field(None, max_length=500)
    status: EntityStatus | None = None
    extra_image_ids: list[UUID] | None = None


class ProductImageOut(ORMModel):
    image_id: UUID
    url: str
    is_primary: bool
    order_index: int


class ProductOut(TimestampSchema):
    id: UUID
    venue_id: UUID
    name: str
    description: str | None
    price: Decimal
    category_id: UUID | None
    image_id: UUID | None
    image_url: str | None = None
    calories: int | None
    allergens: str | None
    status: EntityStatus
    images: list[ProductImageOut] = Field(default_factory=list)
