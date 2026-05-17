
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireStaff, RequireViewer
from app.models.crop import Crop
from app.models.enums import EntityStatus
from app.models.image import Image
from app.schemas.common import PaginatedMeta
from app.schemas.crop import CropCreate, CropOut, CropUpdate
from app.services.audit import record_audit
from app.services.menu_builder import invalidate_menu_cache

router = APIRouter(prefix="/crops", tags=["crops"])
def _crop_out(db, crop: Crop) -> CropOut:
    url = None
    if crop.image_id:
        img = db.query(Image).filter(Image.id == crop.image_id).first()
        url = img.url if img else None
    return CropOut(
        id=crop.id,
        venue_id=crop.venue_id,
        name=crop.name,
        name_en=crop.name_en,
        type=crop.type,
        season=crop.season,
        country=crop.country,
        country_en=crop.country_en,
        process=crop.process,
        process_en=crop.process_en,
        variety=crop.variety,
        altitude=crop.altitude,
        notes=crop.notes,
        notes_en=crop.notes_en,
        image_id=crop.image_id,
        image_url=url,
        status=crop.status,
        created_at=crop.created_at,
        updated_at=crop.updated_at,
    )
@router.post("", response_model=CropOut, status_code=status.HTTP_201_CREATED)
def create_crop(body: CropCreate, db: DbSession, current: RequireStaff):
    crop = Crop(venue_id=current.venue_id, **body.model_dump())
    db.add(crop)
    db.flush()
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="create", entity_type="crop", entity_id=str(crop.id))
    db.commit()
    db.refresh(crop)
    invalidate_menu_cache(current.venue_id)
    return _crop_out(db, crop)
@router.get("", response_model=dict)
def list_crops(
    db: DbSession,
    current: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = None,
):
    query = db.query(Crop).filter(Crop.venue_id == current.venue_id, Crop.deleted_at.is_(None))
    if q:
        query = query.filter(Crop.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(Crop.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [_crop_out(db, c) for c in items],
        "meta": PaginatedMeta(page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size),
    }
@router.get("/{crop_id}", response_model=CropOut)
def get_crop(crop_id: UUID, db: DbSession, current: RequireViewer):
    crop = db.query(Crop).filter(Crop.id == crop_id, Crop.venue_id == current.venue_id, Crop.deleted_at.is_(None)).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    return _crop_out(db, crop)
@router.patch("/{crop_id}", response_model=CropOut)
def update_crop(crop_id: UUID, body: CropUpdate, db: DbSession, current: RequireStaff):
    crop = db.query(Crop).filter(Crop.id == crop_id, Crop.venue_id == current.venue_id, Crop.deleted_at.is_(None)).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(crop, field, value)
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="update", entity_type="crop", entity_id=str(crop.id))
    db.commit()
    db.refresh(crop)
    invalidate_menu_cache(current.venue_id)
    return _crop_out(db, crop)
@router.delete("/{crop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crop(crop_id: UUID, db: DbSession, current: RequireStaff):
    crop = db.query(Crop).filter(Crop.id == crop_id, Crop.venue_id == current.venue_id, Crop.deleted_at.is_(None)).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    crop.deleted_at = datetime.now(timezone.utc)
    crop.status = EntityStatus.inactive
    record_audit(db, venue_id=current.venue_id, user_id=current.id, action="soft_delete", entity_type="crop", entity_id=str(crop.id))
    db.commit()
    invalidate_menu_cache(current.venue_id)
