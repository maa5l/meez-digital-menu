# Meez Menu API (FastAPI)

Dynamic Data-Driven Menu System — منتجات، محاصيل، صور، وتصنيفات مرتبطة بمنيو ديناميكي.

## التشغيل السريع

```bash
# 1) قاعدة البيانات + Redis
docker compose -f docker-compose.api.yml up -d postgres redis

# 2) Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# 3) تهيئة الجداول + بيانات تجريبية
export PYTHONPATH=.
python -m scripts.seed

# 4) تشغيل API
uvicorn app.main:app --reload --port 8000
```

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

## المصادقة

```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@meez.app","password":"MeezOwner2026!"}'
```

استخدم `Authorization: Bearer <token>` لبقية الطلبات.

## Endpoints رئيسية

| Method | Path | الوصف |
|--------|------|--------|
| POST | `/api/v1/auth/token` | تسجيل دخول |
| POST | `/api/v1/auth/register` | حساب جديد + منشأة |
| POST | `/api/v1/products` | إضافة منتج |
| POST | `/api/v1/crops` | إضافة محصول |
| POST | `/api/v1/categories` | إضافة تصنيف |
| POST | `/api/v1/images` | رفع صورة (multipart) |
| GET | `/api/v1/menu` | **منيو ديناميكي** |
| GET | `/api/v1/products/search?q=` | بحث |

## GET /menu

يجمع البيانات من DB، يبني أقساماً جاهزة للواجهة، يفلتر حسب `role`، ويستخدم Redis cache (اختياري).

```json
{
  "venue_id": "...",
  "role": "owner",
  "menu": [
    {
      "title": "Products",
      "type": "product",
      "items": [
        { "name": "Latte", "image": "http://...", "type": "product", "price": 18 }
      ]
    }
  ],
  "generated_at": "2026-05-17T12:00:00Z",
  "cached": false
}
```

## الأمان

- Pydantic validation
- SQLAlchemy ORM (لا SQL خام)
- JWT + RBAC (`viewer` / `staff` / `owner` / `admin`)
- فحص صور: Pillow + MIME + حجم + امتداد
- Rate limit على رفع الصور (SlowAPI)
- Soft delete + Audit logs

## هيكل قاعدة البيانات

- `venues` — multi-tenant
- `users` — RBAC
- `images` — تخزين محلي أو S3
- `categories` — مع `parent_id`
- `products` + `product_images`
- `crops`
- `menu_items` — بناء منيو مخصص
- `audit_logs`

راجع `alembic/versions/001_initial_schema.py` و `docs/DATABASE_SCHEMA.md`.
