from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.images import limiter
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.logging_config import setup_logging

settings = get_settings()
setup_logging()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/")
    def root():
        """توجيه المطورين — الواجهة على منفذ Vite وليس هنا."""
        frontend = settings.cors_origin_list[0] if settings.cors_origin_list else "http://localhost:8080"
        return {
            "service": settings.app_name,
            "message": "هذا خادم API فقط. افتح الواجهة من الرابط أدناه.",
            "frontend": frontend,
            "docs": "/docs",
            "health": f"{settings.api_v1_prefix}/health",
            "api_base": settings.api_v1_prefix,
        }

    @app.get(settings.api_v1_prefix)
    def api_v1_root():
        return {
            "version": "v1",
            "health": f"{settings.api_v1_prefix}/health",
            "auth": f"{settings.api_v1_prefix}/auth/token",
            "menu": f"{settings.api_v1_prefix}/menu",
            "products": f"{settings.api_v1_prefix}/products",
            "crops": f"{settings.api_v1_prefix}/crops",
        }

    if settings.storage_backend == "local":
        upload_path = Path(settings.local_upload_dir)
        upload_path.mkdir(parents=True, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

    @app.on_event("startup")
    def on_startup():
        if settings.debug:
            try:
                Base.metadata.create_all(bind=engine)
            except Exception as exc:
                import logging
                logging.getLogger("meez.api").warning("DB init skipped: %s", exc)

    return app


app = create_app()
