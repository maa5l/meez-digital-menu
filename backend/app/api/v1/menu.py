
from fastapi import APIRouter, Query

from app.api.deps import DbSession, RequireViewer
from app.schemas.menu import DynamicMenuResponse
from app.services.menu_builder import build_dynamic_menu

router = APIRouter(prefix="/menu", tags=["menu"])
@router.get("", response_model=DynamicMenuResponse)
def get_dynamic_menu(
    db: DbSession,
    current: RequireViewer,
    no_cache: bool = Query(False, description="Bypass Redis cache"),
):
    """
    يبني المنيو ديناميكياً من:
    - menu_items (إن وُجدت)
    - أو توليد تلقائي من categories + products + crops

    يُفلتر حسب دور المستخدم (RBAC).
    """
    return build_dynamic_menu(
        db,
        venue_id=current.venue_id,
        role=current.role,
        use_cache=not no_cache,
    )
