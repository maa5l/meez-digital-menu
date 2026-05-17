from __future__ import annotations

import io
import logging
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image as PILImage

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("meez.images")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _validate_image_content(content: bytes) -> tuple[str, int, int]:
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_upload_bytes} bytes",
        )
    try:
        img = PILImage.open(io.BytesIO(content))
        img.verify()
        img = PILImage.open(io.BytesIO(content))
        width, height = img.size
        mime = PILImage.MIME.get(img.format, "application/octet-stream")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc

    if mime not in settings.allowed_mime_set:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image format")
    return mime, width, height


async def save_upload(file: UploadFile) -> tuple[str, str, str, int]:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename required")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file extension")

    content = await file.read()
    mime, _, _ = _validate_image_content(content)

    file_id = uuid.uuid4()
    filename = f"{file_id}{ext}"

    if settings.storage_backend == "s3":
        storage_path, url = _save_s3(filename, content, mime)
    else:
        storage_path, url = _save_local(filename, content)

    logger.info({"event": "image.uploaded", "path": storage_path, "mime": mime, "bytes": len(content)})
    return storage_path, url, mime, len(content)


def _save_local(filename: str, content: bytes) -> tuple[str, str]:
    upload_dir = Path(settings.local_upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    path = upload_dir / filename
    path.write_bytes(content)
    storage_path = str(path)
    url = f"{settings.public_base_url.rstrip('/')}/uploads/{filename}"
    return storage_path, url


def _save_s3(filename: str, content: bytes, mime: str) -> tuple[str, str]:
    if not settings.s3_bucket:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="S3 not configured")
    import boto3

    client = boto3.client(
        "s3",
        region_name=settings.s3_region,
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
    )
    key = f"images/{filename}"
    client.put_object(Bucket=settings.s3_bucket, Key=key, Body=content, ContentType=mime)
    if settings.s3_public_url_prefix:
        url = f"{settings.s3_public_url_prefix.rstrip('/')}/{key}"
    else:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=3600 * 24 * 7,
        )
    return key, url
