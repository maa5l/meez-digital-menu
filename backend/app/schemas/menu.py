from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import MenuItemType, VisibilityRole


class MenuItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    type: MenuItemType
    reference_id: UUID | None = None
    icon: str | None = Field(None, max_length=16)
    order_index: int = 0
    is_active: bool = True
    visibility_role: VisibilityRole = VisibilityRole.public
    custom_payload: dict[str, Any] | None = None


class MenuItemOut(BaseModel):
    id: UUID
    title: str
    type: MenuItemType
    reference_id: UUID | None
    icon: str | None
    order_index: int
    is_active: bool
    visibility_role: VisibilityRole


class MenuEntryItem(BaseModel):
    id: str
    name: str
    type: str
    image: str | None = None
    description: str | None = None
    price: float | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class MenuSection(BaseModel):
    title: str
    type: str
    icon: str | None = None
    items: list[MenuEntryItem] = Field(default_factory=list)


class DynamicMenuResponse(BaseModel):
    venue_id: UUID
    role: str
    menu: list[MenuSection]
    generated_at: str
    cached: bool = False
