from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.cache import menu_cache
from app.models.category import Category
from app.models.crop import Crop
from app.models.enums import EntityStatus, MenuItemType, UserRole, VisibilityRole
from app.models.image import Image
from app.models.menu_item import MenuItem
from app.models.product import Product
from app.schemas.menu import DynamicMenuResponse, MenuEntryItem, MenuSection

ROLE_TO_VISIBILITY = {
    UserRole.viewer: {VisibilityRole.public, VisibilityRole.viewer},
    UserRole.staff: {VisibilityRole.public, VisibilityRole.viewer, VisibilityRole.staff},
    UserRole.owner: {
        VisibilityRole.public,
        VisibilityRole.viewer,
        VisibilityRole.staff,
        VisibilityRole.owner,
    },
    UserRole.admin: {
        VisibilityRole.public,
        VisibilityRole.viewer,
        VisibilityRole.staff,
        VisibilityRole.owner,
    },
}


def _image_url(db: Session, image_id: UUID | None) -> str | None:
    if not image_id:
        return None
    img = db.query(Image).filter(Image.id == image_id, Image.deleted_at.is_(None)).first()
    return img.url if img else None


def _can_see(role: UserRole, visibility: VisibilityRole) -> bool:
    return visibility in ROLE_TO_VISIBILITY.get(role, {VisibilityRole.public})


def build_dynamic_menu(db: Session, *, venue_id: UUID, role: UserRole, use_cache: bool = True) -> DynamicMenuResponse:
    cache_key = f"menu:{venue_id}:{role.value}"
    if use_cache:
        cached = menu_cache.get(cache_key)
        if cached:
            cached["cached"] = True
            return DynamicMenuResponse(**cached)

    sections: list[MenuSection] = []
    menu_items = (
        db.query(MenuItem)
        .filter(
            MenuItem.venue_id == venue_id,
            MenuItem.deleted_at.is_(None),
            MenuItem.is_active.is_(True),
        )
        .order_by(MenuItem.order_index.asc())
        .all()
    )

    if menu_items:
        grouped: dict[str, MenuSection] = {}
        for item in menu_items:
            if not _can_see(role, item.visibility_role):
                continue
            section_key = item.type.value
            if section_key not in grouped:
                grouped[section_key] = MenuSection(
                    title=item.title if item.type == MenuItemType.custom else section_key.title(),
                    type=section_key,
                    icon=item.icon,
                    items=[],
                )
            entry = _resolve_menu_item(db, item, venue_id)
            if entry:
                grouped[section_key].items.append(entry)
        sections = [s for s in grouped.values() if s.items]
    else:
        sections = _auto_build_menu(db, venue_id=venue_id, role=role)

    response = DynamicMenuResponse(
        venue_id=venue_id,
        role=role.value,
        menu=sections,
        generated_at=datetime.now(timezone.utc).isoformat(),
        cached=False,
    )
    menu_cache.set(cache_key, response.model_dump(mode="json"))
    return response


def _resolve_menu_item(db: Session, item: MenuItem, venue_id: UUID) -> MenuEntryItem | None:
    if item.type == MenuItemType.product and item.reference_id:
        p = (
            db.query(Product)
            .filter(
                Product.id == item.reference_id,
                Product.venue_id == venue_id,
                Product.deleted_at.is_(None),
                Product.status == EntityStatus.active,
            )
            .first()
        )
        if not p:
            return None
        return MenuEntryItem(
            id=str(p.id),
            name=p.name,
            type="product",
            image=_image_url(db, p.image_id),
            description=p.description,
            price=float(p.price),
            meta={"category_id": str(p.category_id) if p.category_id else None, "calories": p.calories},
        )

    if item.type == MenuItemType.crop and item.reference_id:
        c = (
            db.query(Crop)
            .filter(
                Crop.id == item.reference_id,
                Crop.venue_id == venue_id,
                Crop.deleted_at.is_(None),
                Crop.status == EntityStatus.active,
            )
            .first()
        )
        if not c:
            return None
        return MenuEntryItem(
            id=str(c.id),
            name=c.name,
            type="crop",
            image=_image_url(db, c.image_id),
            description=c.notes,
            meta={"season": c.season, "country": c.country, "process": c.process},
        )

    if item.type == MenuItemType.category and item.reference_id:
        cat = (
            db.query(Category)
            .filter(Category.id == item.reference_id, Category.venue_id == venue_id, Category.deleted_at.is_(None))
            .first()
        )
        if not cat:
            return None
        products = (
            db.query(Product)
            .filter(
                Product.category_id == cat.id,
                Product.venue_id == venue_id,
                Product.deleted_at.is_(None),
                Product.status == EntityStatus.active,
            )
            .all()
        )
        return MenuEntryItem(
            id=str(cat.id),
            name=cat.name,
            type="category",
            image=None,
            meta={
                "slug": cat.slug,
                "icon": cat.icon,
                "products": [
                    {
                        "id": str(p.id),
                        "name": p.name,
                        "image": _image_url(db, p.image_id),
                        "price": float(p.price),
                    }
                    for p in products
                ],
            },
        )

    if item.type == MenuItemType.custom:
        return MenuEntryItem(id=str(item.id), name=item.title, type="custom", image=None)

    return None


def _auto_build_menu(db: Session, *, venue_id: UUID, role: UserRole) -> list[MenuSection]:
    sections: list[MenuSection] = []

    categories = (
        db.query(Category)
        .filter(Category.venue_id == venue_id, Category.deleted_at.is_(None), Category.parent_id.is_(None))
        .order_by(Category.name.asc())
        .all()
    )

    product_items: list[MenuEntryItem] = []
    for cat in categories:
        products = (
            db.query(Product)
            .options(joinedload(Product.primary_image))
            .filter(
                Product.category_id == cat.id,
                Product.venue_id == venue_id,
                Product.deleted_at.is_(None),
                Product.status == EntityStatus.active,
            )
            .order_by(Product.name.asc())
            .all()
        )
        for p in products:
            product_items.append(
                MenuEntryItem(
                    id=str(p.id),
                    name=p.name,
                    type="product",
                    image=_image_url(db, p.image_id),
                    description=p.description,
                    price=float(p.price),
                    meta={"category": cat.name, "category_id": str(cat.id), "allergens": p.allergens},
                )
            )

    if product_items:
        sections.append(MenuSection(title="Products", type="product", items=product_items))

    crops = (
        db.query(Crop)
        .filter(Crop.venue_id == venue_id, Crop.deleted_at.is_(None), Crop.status == EntityStatus.active)
        .order_by(Crop.name.asc())
        .all()
    )
    crop_items = [
        MenuEntryItem(
            id=str(c.id),
            name=c.name,
            type="crop",
            image=_image_url(db, c.image_id),
            description=c.notes,
            meta={"season": c.season, "type": c.type, "country": c.country},
        )
        for c in crops
    ]
    if crop_items:
        sections.append(MenuSection(title="Crops", type="crop", items=crop_items))

    return sections


def invalidate_menu_cache(venue_id: UUID) -> None:
    menu_cache.delete_pattern(f"menu:{venue_id}:")
