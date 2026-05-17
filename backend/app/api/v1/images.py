from typing import Optional
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import DbSession, RequireStaff, RequireViewer
from app.core.config import get_settings
from app.models.enums import ImageType
from app.models.image import Image
from app.schemas.image import ImageOut
from app.services.audit import record_audit
from app.services.image_storage import save_upload
from app.services.menu_builder import invalidate_menu_cache

settings = get_settings()
router = APIRouter(prefix="/images", tags=["images"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_upload)
async def upload_image(
    request: Request,
    db: DbSession,
    current: RequireStaff,
    file: UploadFile = File(...),
    alt_text: Optional[str] = Form(None),
    type: ImageType = Form(ImageType.general),
):
    storage_path, url, mime, size = await save_upload(file)
    image = Image(
        venue_id=current.venue_id,
        url=url,
        storage_path=storage_path,
        alt_text=alt_text,
        mime_type=mime,
        size_bytes=size,
        type=type,
    )
    db.add(image)
    record_audit(
        db,
        venue_id=current.venue_id,
        user_id=current.id,
        action="upload",
        entity_type="image",
        entity_id=str(image.id),
        payload={"mime": mime, "bytes": size},
    )
    db.commit()
    db.refresh(image)
    invalidate_menu_cache(current.venue_id)
    return image


@router.get("/{image_id}", response_model=ImageOut)
def get_image(image_id: UUID, db: DbSession, current: RequireViewer):
    image = db.query(Image).filter(Image.id == image_id, Image.venue_id == current.venue_id, Image.deleted_at.is_(None)).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image
