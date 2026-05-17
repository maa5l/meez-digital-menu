from __future__ import annotations
from typing import Optional

import enum


class UserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    staff = "staff"
    viewer = "viewer"


class EntityStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    draft = "draft"


class ImageType(str, enum.Enum):
    product = "product"
    crop = "crop"
    general = "general"


class MenuItemType(str, enum.Enum):
    product = "product"
    crop = "crop"
    category = "category"
    custom = "custom"


class VisibilityRole(str, enum.Enum):
    public = "public"
    viewer = "viewer"
    staff = "staff"
    owner = "owner"
