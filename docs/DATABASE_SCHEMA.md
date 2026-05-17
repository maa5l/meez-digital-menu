# Database Schema — Dynamic Menu System

## ERD (مبسّط)

```
venues 1───* users
venues 1───* categories (self parent_id)
venues 1───* products ──* product_images *── images
venues 1───* crops ────── images (image_id)
venues 1───* menu_items
venues 1───* audit_logs
```

## الجداول

### venues
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | varchar(200) | |
| slug | varchar(120) unique | tenant key |

### users (RBAC)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| venue_id | UUID FK | |
| name | varchar(200) | |
| email | varchar(320) | unique per venue |
| hashed_password | varchar(255) | bcrypt |
| role | enum | owner, admin, staff, viewer |
| deleted_at | timestamptz | soft delete |

### images
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| venue_id | UUID FK | |
| url | text | CDN / public URL |
| storage_path | text | local path or S3 key |
| alt_text | varchar(500) | |
| mime_type | varchar(100) | validated on upload |
| size_bytes | bigint | |
| type | enum | product, crop, general |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, slug | | slug for URLs |
| parent_id | UUID FK nullable | subcategories |

### products
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, description, price | | |
| category_id | UUID FK | |
| image_id | UUID FK | primary image |
| calories, allergens | | menu display |
| status | enum | active / inactive / draft |

### product_images
Many-to-many: product ↔ images with `is_primary`, `order_index`.

### crops
| Column | Type | Notes |
|--------|------|-------|
| name, type, season | | per spec |
| country, process, variety, altitude, notes | | extended AR/EN |
| image_id | UUID FK | |

### menu_items
| Column | Type | Notes |
|--------|------|-------|
| title | varchar | section/item label |
| type | enum | product, crop, category, custom |
| reference_id | UUID | polymorphic FK |
| order_index | int | sort order |
| visibility_role | enum | RBAC filter |
| is_active | bool | |

### audit_logs
JSONB `payload` + action + entity_type for compliance.

## منطق المنيو

1. إن وُجدت `menu_items` نشطة → تُحل المراجع وتُجمّع حسب النوع.
2. وإلا → توليد تلقائي: Products (حسب categories) + Crops.
3. فلترة `visibility_role` حسب دور JWT.
4. Cache في Redis: `menu:{venue_id}:{role}`.

Migration: `backend/alembic/versions/001_initial_schema.py`
