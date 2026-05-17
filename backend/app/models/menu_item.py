from __future__ import annotations
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import MenuItemType, VisibilityRole


class MenuItem(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "menu_items"

    venue_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[MenuItemType] = mapped_column(Enum(MenuItemType, name="menu_item_type"), nullable=False)
    reference_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    icon: Mapped[Optional[str]] = mapped_column(String(16))
    order_index: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    visibility_role: Mapped[VisibilityRole] = mapped_column(
        Enum(VisibilityRole, name="visibility_role"), nullable=False, default=VisibilityRole.public
    )
    custom_payload: Mapped[Optional[str]] = mapped_column(String(2000))

    venue = relationship("Venue", back_populates="menu_items")
