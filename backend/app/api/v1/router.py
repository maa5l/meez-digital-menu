
from fastapi import APIRouter

from app.api.v1 import auth, categories, crops, images, menu, products

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(crops.router)
api_router.include_router(images.router)
api_router.include_router(menu.router)
@api_router.get("/health")
def health():
    return {"status": "ok", "service": "meez-menu-api"}
