
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import DbSession, RequireStaff, RequireViewer
from app.models.enums import EntityStatus
from app.models.image import Image
from app.models.product import Product, ProductImage
from app.schemas.common import PaginatedMeta
from app.schemas.product import ProductCreate, ProductImageOut, ProductOut, ProductUpdate
from app.services.audit import record_audit
from app.services.menu_builder import invalidate_menu_cache

router = APIRouter(prefix="/products", tags=["products"])
def _product_out(db: Session, product: Product) -> ProductOut:
    gallery = (
        db.query(ProductImage, Image)
        .join(Image, ProductImage.image_id == Image.id)
        .filter(ProductImage.product_id == product.id, Image.deleted_at.is_(None))
        .order_by(ProductImage.order_index.asc())
        .all()
    )
    images = [
        ProductImageOut(
            image_id=link.image_id,
            url=img.url,
            is_primary=link.is_primary,
            order_index=link.order_index,
        )
        for link, img in gallery
    ]
    primary_url = None
    if product.image_id:
        img = db.query(Image).filter(Image.id == product.image_id).first()
        primary_url = img.url if img else None
    return ProductOut(
        id=product.id,
        venue_id=product.venue_id,
        name=product.name,
        description=product.description,
        price=product.price,
        category_id=product.category_id,
        image_id=product.image_id,
        image_url=primary_url,
        calories=product.calories,
        allergens=product.allergens,
        status=product.status,
        images=images,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )
@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: DbSession, current: RequireStaff):
    product = Product(
        venue_id=current.venue_id,
        name=body.name,
        description=body.description,
        price=body.price,
        category_id=body.category_id,
        image_id=body.image_id,
        calories=body.calories,
        allergens=body.allergens,
        status=body.status,
    )
    db.add(product)
    db.flush()
    for idx, image_id in enumerate(body.extra_image_ids or []):
        db.add(
            ProductImage(
                product_id=product.id,
                image_id=image_id,
                is_primary=image_id == body.image_id,
                order_index=idx,
            )
        )
    record_audit(
        db,
        venue_id=current.venue_id,
        user_id=current.id,
        action="create",
        entity_type="product",
        entity_id=str(product.id),
    )
    db.commit()
    db.refresh(product)
    invalidate_menu_cache(current.venue_id)
    return _product_out(db, product)
@router.get("", response_model=dict)
def list_products(
    db: DbSession,
    current: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=200),
    category_id: Optional[UUID] = None,
):
    query = db.query(Product).filter(
        Product.venue_id == current.venue_id,
        Product.deleted_at.is_(None),
    )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    total = query.count()
    items = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "data": [_product_out(db, p) for p in items],
        "meta": PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            pages=(total + page_size - 1) // page_size,
        ),
    }
@router.get("/search", response_model=list[ProductOut])
def search_products(db: DbSession, current: RequireViewer, q: str = Query(..., min_length=1, max_length=200)):
    items = (
        db.query(Product)
        .filter(
            Product.venue_id == current.venue_id,
            Product.deleted_at.is_(None),
            Product.status == EntityStatus.active,
            Product.name.ilike(f"%{q}%"),
        )
        .limit(50)
        .all()
    )
    return [_product_out(db, p) for p in items]
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: UUID, db: DbSession, current: RequireViewer):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.venue_id == current.venue_id, Product.deleted_at.is_(None))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_out(db, product)
@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: UUID, body: ProductUpdate, db: DbSession, current: RequireStaff):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.venue_id == current.venue_id, Product.deleted_at.is_(None))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in body.model_dump(exclude_unset=True, exclude={"extra_image_ids"}).items():
        setattr(product, field, value)
    if body.extra_image_ids is not None:
        db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
        for idx, image_id in enumerate(body.extra_image_ids):
            db.add(ProductImage(product_id=product.id, image_id=image_id, order_index=idx))
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="update", entity_type="product", entity_id=str(product.id))
    db.commit()
    db.refresh(product)
    invalidate_menu_cache(current.venue_id)
    return _product_out(db, product)
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: UUID, db: DbSession, current: RequireStaff):
    from datetime import datetime, timezone

    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.venue_id == current.venue_id, Product.deleted_at.is_(None))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.deleted_at = datetime.now(timezone.utc)
    product.status = EntityStatus.inactive
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="soft_delete", entity_type="product", entity_id=str(product.id))
    db.commit()
    invalidate_menu_cache(current.venue_id)
