-- =============================================================================
-- 202607250013 — Extra performance indexes (composite / partial / trgm)
-- Safe: CREATE INDEX IF NOT EXISTS only
-- =============================================================================

-- Catalog search / filters
CREATE INDEX IF NOT EXISTS menu_products_owner_status_sort_idx
  ON public.menu_products (owner_id, status, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_crops_owner_status_sort_idx
  ON public.menu_crops (owner_id, status, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_categories_owner_status_idx
  ON public.menu_categories (owner_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_products_name_en_trgm_idx
  ON public.menu_products USING gin (name_en gin_trgm_ops)
  WHERE name_en IS NOT NULL AND deleted_at IS NULL;

-- Media
CREATE INDEX IF NOT EXISTS media_assets_owner_created_idx
  ON public.media_assets (owner_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_alt_trgm_idx
  ON public.media_assets USING gin (alt_text gin_trgm_ops)
  WHERE alt_text IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_usage_owner_entity_idx
  ON public.media_usage (owner_id, entity_type, entity_id);

-- CMS publish filters
CREATE INDEX IF NOT EXISTS blogs_status_published_idx
  ON public.blogs (status, published_at DESC);

CREATE INDEX IF NOT EXISTS faqs_published_sort_idx
  ON public.faqs (is_published, sort_order);

CREATE INDEX IF NOT EXISTS banners_placement_status_idx
  ON public.banners (placement, status);

-- Security / activity
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx
  ON public.activity_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON public.audit_logs (entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_phone_trgm_idx
  ON public.profiles USING gin (phone gin_trgm_ops)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_venue_name_trgm_idx
  ON public.profiles USING gin (venue_name gin_trgm_ops)
  WHERE venue_name IS NOT NULL;

-- Feature flag / config hot paths already PK'd
ANALYZE public.media_assets;
ANALYZE public.menu_products;
ANALYZE public.system_config;
