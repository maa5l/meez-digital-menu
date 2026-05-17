from __future__ import annotations
from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.core.database import Base


class Venue(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "venues"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)

    users = relationship("User", back_populates="venue")
    categories = relationship("Category", back_populates="venue")
    products = relationship("Product", back_populates="venue")
    crops = relationship("Crop", back_populates="venue")
    images = relationship("Image", back_populates="venue")
    menu_items = relationship("MenuItem", back_populates="venue")
