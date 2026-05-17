
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession, RequireStaff, RequireViewer
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services.audit import record_audit
from app.services.menu_builder import invalidate_menu_cache

router = APIRouter(prefix="/categories", tags=["categories"])
@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, db: DbSession, current: RequireStaff):
    existing = (
        db.query(Category)
        .filter(Category.venue_id == current.venue_id, Category.slug == body.slug, Category.deleted_at.is_(None))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Category slug already exists")
    cat = Category(venue_id=current.venue_id, name=body.name, slug=body.slug, parent_id=body.parent_id, icon=body.icon)
    db.add(cat)
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="create", entity_type="category", entity_id=str(cat.id))
    db.commit()
    db.refresh(cat)
    invalidate_menu_cache(current.venue_id)
    return cat
@router.get("", response_model=list[CategoryOut])
def list_categories(db: DbSession, current: RequireViewer):
    return (
        db.query(Category)
        .filter(Category.venue_id == current.venue_id, Category.deleted_at.is_(None))
        .order_by(Category.name.asc())
        .all()
    )
@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(category_id: UUID, body: CategoryUpdate, db: DbSession, current: RequireStaff):
    cat = db.query(Category).filter(Category.id == category_id, Category.venue_id == current.venue_id, Category.deleted_at.is_(None)).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    data = body.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        from app.schemas.category import slugify

        data["slug"] = slugify(data["slug"])
    for field, value in data.items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    invalidate_menu_cache(current.venue_id)
    return cat
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: UUID, db: DbSession, current: RequireStaff):
    cat = db.query(Category).filter(Category.id == category_id, Category.venue_id == current.venue_id, Category.deleted_at.is_(None)).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.deleted_at = datetime.now(timezone.utc)
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="soft_delete", entity_type="category", entity_id=str(cat.id))
    db.commit()
    invalidate_menu_cache(current.venue_id)
