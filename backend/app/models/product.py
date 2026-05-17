from __future__ import annotations
from typing import Optional

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import EntityStatus


class Product(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"

    venue_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    category_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), index=True)
    image_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("images.id"))
    calories: Mapped[Optional[int]] = mapped_column(default=0)
    allergens: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[EntityStatus] = mapped_column(
        Enum(EntityStatus, name="entity_status"), nullable=False, default=EntityStatus.active
    )

    venue = relationship("Venue", back_populates="products")
    category = relationship("Category", back_populates="products")
    primary_image = relationship("Image", foreign_keys=[image_id])
    gallery = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "product_images"

    product_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    image_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("images.id"), nullable=False, index=True)
    is_primary: Mapped[bool] = mapped_column(default=False)
    order_index: Mapped[int] = mapped_column(default=0)

    product = relationship("Product", back_populates="gallery")
    image = relationship("Image", back_populates="product_links")
