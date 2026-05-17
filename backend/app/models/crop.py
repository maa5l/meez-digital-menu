from __future__ import annotations
from typing import Optional

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import EntityStatus


class Crop(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "crops"

    venue_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[Optional[str]] = mapped_column(String(200))
    type: Mapped[Optional[str]] = mapped_column(String(120))
    season: Mapped[Optional[str]] = mapped_column(String(120))
    country: Mapped[Optional[str]] = mapped_column(String(120))
    country_en: Mapped[Optional[str]] = mapped_column(String(120))
    process: Mapped[Optional[str]] = mapped_column(String(120))
    process_en: Mapped[Optional[str]] = mapped_column(String(120))
    variety: Mapped[Optional[str]] = mapped_column(String(120))
    altitude: Mapped[Optional[str]] = mapped_column(String(80))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    notes_en: Mapped[Optional[str]] = mapped_column(Text)
    image_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("images.id"))
    status: Mapped[EntityStatus] = mapped_column(
        Enum(EntityStatus, name="entity_status"), nullable=False, default=EntityStatus.active
    )

    venue = relationship("Venue", back_populates="crops")
    image = relationship("Image", foreign_keys=[image_id])
