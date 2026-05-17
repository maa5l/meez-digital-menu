# API Documentation — Meez Menu API v1

**Base URL:** `http://localhost:8000/api/v1`  
**Swagger:** `http://localhost:8000/docs`

## Authentication

```http
POST /auth/token
Content-Type: application/json

{ "email": "owner@meez.app", "password": "MeezOwner2026!" }
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user_id": "uuid",
  "venue_id": "uuid",
  "role": "owner"
}
```

All protected routes: `Authorization: Bearer <access_token>`

### RBAC

| Role | Read | Write |
|------|------|-------|
| viewer | ✓ | |
| staff | ✓ | ✓ |
| owner | ✓ | ✓ |
| admin | ✓ | ✓ |

---

## Health

`GET /health` → `{ "status": "ok", "service": "meez-menu-api" }`

---

## Products

| Method | Path | Auth |
|--------|------|------|
| POST | `/products` | staff+ |
| GET | `/products?page=1&page_size=20` | viewer+ |
| GET | `/products/search?q=latte` | viewer+ |
| GET | `/products/{id}` | viewer+ |
| PATCH | `/products/{id}` | staff+ |
| DELETE | `/products/{id}` | staff+ (soft) |

---

## Crops

| Method | Path |
|--------|------|
| POST | `/crops` |
| GET | `/crops` |
| GET | `/crops/{id}` |
| PATCH | `/crops/{id}` |
| DELETE | `/crops/{id}` |

---

## Categories

| Method | Path |
|--------|------|
| POST | `/categories` |
| GET | `/categories` |
| PATCH | `/categories/{id}` |
| DELETE | `/categories/{id}` |

---

## Images

`POST /images` — `multipart/form-data`

| Field | Type |
|-------|------|
| file | binary (required) |
| alt_text | string |
| type | product \| crop \| general |

Limits: 5MB, JPEG/PNG/WebP/GIF. Rate limit: 20/min.

---

## Menu (Dynamic)

`GET /menu?no_cache=false`

Builds menu from DB — menu_items or auto-generated sections.

```json
{
  "venue_id": "uuid",
  "role": "owner",
  "menu": [
    {
      "title": "Products",
      "type": "product",
      "items": [
        {
          "id": "uuid",
          "name": "Latte",
          "type": "product",
          "image": "http://localhost:8000/uploads/....jpg",
          "price": 18,
          "description": "...",
          "meta": { "category": "مشروبات" }
        }
      ]
    }
  ],
  "generated_at": "2026-05-17T12:00:00+00:00",
  "cached": false
}
```

---

## Auth / Register

`POST /auth/register` — creates venue + first user as `owner`.

```json
{
  "name": "أحمد",
  "email": "owner@cafe.com",
  "password": "SecurePass123",
  "venue_slug": "my-cafe"
}
```

---

## Environment

See `backend/.env.example` and `docker-compose.api.yml`.

Frontend: set `VITE_API_BASE_URL=http://localhost:8000/api/v1`
