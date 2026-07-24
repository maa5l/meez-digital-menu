-- Meez FULL PRODUCTION SCHEMA (001-013)



-- >>> 202607250001_platform_enums_and_helpers.sql

-- =============================================================================
-- 202607250001 — Platform enums + shared helpers (additive, non-breaking)
-- Compatible with Supabase PostgreSQL 15–17
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Enum helpers (idempotent)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.media_role AS ENUM (
    'original', 'portrait', 'landscape', 'square',
    'hero', 'cover', 'banner', 'gallery', 'thumbnail',
    'logo', 'featured', 'background', 'mobile', 'desktop', 'retina', 'og', 'icon'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.media_status AS ENUM (
    'pending', 'processing', 'ready', 'failed', 'archived', 'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.media_visibility AS ENUM ('private', 'unlisted', 'public');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.optimization_status AS ENUM (
    'pending', 'processing', 'optimized', 'skipped', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publish_status AS ENUM (
    'draft', 'scheduled', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.locale_code AS ENUM ('ar', 'en');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.permission_action AS ENUM (
    'create', 'read', 'update', 'delete', 'manage', 'publish', 'export'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.venue_member_role AS ENUM (
    'owner', 'manager', 'editor', 'viewer', 'staff'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.security_event_severity AS ENUM (
    'info', 'low', 'medium', 'high', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM (
    'draft', 'active', 'archived', 'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM (
    'email', 'sms', 'push', 'in_app', 'whatsapp'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM (
    'pending', 'queued', 'sent', 'delivered', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.catalog_entity_status AS ENUM (
    'draft', 'active', 'hidden', 'archived', 'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger (reuse if present)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'BEFORE UPDATE trigger helper: sets NEW.updated_at = NOW()';

-- ---------------------------------------------------------------------------
-- Ensure admin_users exists (older Meez DBs may not have run admin migrations)
-- Matches 20260614120000 shape; IF NOT EXISTS keeps existing rows intact
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'support');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'admin',
  full_name TEXT,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_users_role_idx ON public.admin_users (role);
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users (email);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin / ownership helpers used by RLS (plpgsql = no create-time table parse)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'True when auth.uid() is an active row in admin_users (false if table missing)';
COMMENT ON FUNCTION public.current_owner_id() IS
  'Returns auth.uid() for ownership checks in RLS';


-- <<< 202607250001_platform_enums_and_helpers.sql


-- >>> 202607250002_create_media_system.sql

-- =============================================================================
-- 202607250002 — Media library (replaces Base64-in-JSON as system of record)
-- Additive: venues.data images remain until app migrates reads/writes.
-- =============================================================================

-- Folders -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
  name          text NOT NULL,
  slug          text,
  sort_order    integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT media_folders_name_len CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS media_folders_owner_parent_name_uidx
  ON public.media_folders (owner_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_folders_owner_idx
  ON public.media_folders (owner_id) WHERE deleted_at IS NULL;

-- Assets --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id           uuid REFERENCES public.media_folders(id) ON DELETE SET NULL,
  role                public.media_role NOT NULL DEFAULT 'original',
  status              public.media_status NOT NULL DEFAULT 'pending',
  visibility          public.media_visibility NOT NULL DEFAULT 'private',
  mime_type           text NOT NULL,
  file_size           bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  width               integer CHECK (width IS NULL OR width > 0),
  height              integer CHECK (height IS NULL OR height > 0),
  aspect_ratio        numeric(10,6) GENERATED ALWAYS AS (
                        CASE WHEN width IS NOT NULL AND height IS NOT NULL AND height > 0
                          THEN round((width::numeric / height::numeric), 6)
                          ELSE NULL END
                      ) STORED,
  original_filename   text,
  storage_bucket      text NOT NULL DEFAULT 'venue-media',
  storage_path        text NOT NULL,
  public_url          text,
  cdn_url             text,
  blurhash            text,
  dominant_color      text,
  focal_point_x       numeric(5,4) CHECK (focal_point_x IS NULL OR (focal_point_x >= 0 AND focal_point_x <= 1)),
  focal_point_y       numeric(5,4) CHECK (focal_point_y IS NULL OR (focal_point_y >= 0 AND focal_point_y <= 1)),
  crop_data           jsonb NOT NULL DEFAULT '{}'::jsonb,
  alt_text            text,
  alt_text_en         text,
  title               text,
  title_en            text,
  caption             text,
  caption_en          text,
  description         text,
  description_en      text,
  content_hash        text,
  compression_status  public.optimization_status NOT NULL DEFAULT 'pending',
  optimization_status public.optimization_status NOT NULL DEFAULT 'pending',
  is_featured         boolean NOT NULL DEFAULT false,
  display_order       integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT media_assets_path_nonempty CHECK (char_length(storage_path) > 0),
  CONSTRAINT media_assets_mime_nonempty CHECK (char_length(mime_type) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_bucket_path_uidx
  ON public.media_assets (storage_bucket, storage_path)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_owner_role_idx
  ON public.media_assets (owner_id, role)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_owner_status_idx
  ON public.media_assets (owner_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_folder_idx
  ON public.media_assets (folder_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_featured_idx
  ON public.media_assets (owner_id)
  WHERE is_featured = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_hash_idx
  ON public.media_assets (owner_id, content_hash)
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL;

-- Variants (responsive / format / density) ----------------------------------
CREATE TABLE IF NOT EXISTS public.media_variants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id            uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role                public.media_role NOT NULL DEFAULT 'original',
  breakpoint          text,                 -- e.g. sm|md|lg|xl|mobile|desktop
  pixel_density       numeric(3,1) NOT NULL DEFAULT 1.0 CHECK (pixel_density > 0),
  format              text NOT NULL,        -- webp|avif|jpg|png|svg
  mime_type           text NOT NULL,
  width               integer CHECK (width IS NULL OR width > 0),
  height              integer CHECK (height IS NULL OR height > 0),
  file_size           bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  storage_bucket      text NOT NULL DEFAULT 'venue-media',
  storage_path        text NOT NULL,
  public_url          text,
  cdn_url             text,
  optimization_status public.optimization_status NOT NULL DEFAULT 'pending',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT media_variants_format_chk CHECK (format IN ('webp','avif','jpg','jpeg','png','svg','gif')),
  CONSTRAINT media_variants_path_nonempty CHECK (char_length(storage_path) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS media_variants_unique_slot_uidx
  ON public.media_variants (
    asset_id,
    role,
    COALESCE(breakpoint, ''),
    pixel_density,
    format
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_variants_asset_idx
  ON public.media_variants (asset_id)
  WHERE deleted_at IS NULL;

-- Tags ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_tags_name_len CHECK (char_length(name) BETWEEN 1 AND 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS media_tags_owner_slug_uidx
  ON public.media_tags (owner_id, lower(slug));

CREATE TABLE IF NOT EXISTS public.media_tag_links (
  media_id  uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES public.media_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, tag_id)
);

-- Collections ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TABLE IF NOT EXISTS public.media_collection_items (
  collection_id uuid NOT NULL REFERENCES public.media_collections(id) ON DELETE CASCADE,
  media_id      uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, media_id)
);

-- Usage / polymorphic attachment --------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id      uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,
  entity_id     uuid NOT NULL,
  usage_role    public.media_role NOT NULL DEFAULT 'gallery',
  display_order integer NOT NULL DEFAULT 0,
  is_primary    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_usage_entity_type_chk CHECK (
    entity_type IN (
      'product','crop','category','venue','theme','page','banner',
      'slider','blog','document','profile','cms_block','announcement'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS media_usage_unique_slot_uidx
  ON public.media_usage (entity_type, entity_id, usage_role, media_id);

CREATE INDEX IF NOT EXISTS media_usage_entity_idx
  ON public.media_usage (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS media_usage_media_idx
  ON public.media_usage (media_id);

CREATE UNIQUE INDEX IF NOT EXISTS media_usage_primary_uidx
  ON public.media_usage (entity_type, entity_id, usage_role)
  WHERE is_primary = true;

-- Versions (immutable history of binary replacements) -----------------------
CREATE TABLE IF NOT EXISTS public.media_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id        uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  version_number  integer NOT NULL CHECK (version_number > 0),
  storage_bucket  text NOT NULL,
  storage_path    text NOT NULL,
  mime_type       text NOT NULL,
  file_size       bigint NOT NULL DEFAULT 0,
  width           integer,
  height          integer,
  content_hash    text,
  change_note     text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_id, version_number)
);

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER media_folders_updated_at
    BEFORE UPDATE ON public.media_folders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER media_assets_updated_at
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER media_variants_updated_at
    BEFORE UPDATE ON public.media_variants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER media_collections_updated_at
    BEFORE UPDATE ON public.media_collections
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.media_assets IS
  'Canonical media metadata; binaries live in Supabase Storage (not Base64 in venues.data)';
COMMENT ON TABLE public.media_variants IS
  'Responsive/format variants (webp/avif/jpg, mobile/desktop, 1x/2x)';
COMMENT ON TABLE public.media_usage IS
  'Links media assets to catalog/CMS entities by role';


-- <<< 202607250002_create_media_system.sql


-- >>> 202607250003_create_storage_buckets.sql

-- =============================================================================
-- 202607250003 — Supabase Storage buckets + policies (additive)
-- NOTE: storage.buckets is owned by supabase_storage_admin.
-- Dashboard SQL may lack ownership → bucket insert is best-effort.
-- If skipped: create buckets manually in Storage UI (names below).
-- =============================================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    (
      'venue-media',
      'venue-media',
      true,
      10485760,
      ARRAY[
        'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'
      ]::text[]
    ),
    (
      'venue-media-private',
      'venue-media-private',
      false,
      20971520,
      ARRAY[
        'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'
      ]::text[]
    ),
    (
      'admin-assets',
      'admin-assets',
      true,
      10485760,
      ARRAY[
        'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'
      ]::text[]
    ),
    (
      'documents',
      'documents',
      false,
      52428800,
      ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg','image/png','text/plain'
      ]::text[]
    )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped storage.buckets insert (42501). Create buckets in Dashboard → Storage: venue-media, venue-media-private, admin-assets, documents';
  WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'Skipped storage.buckets insert (%). Create buckets in Dashboard → Storage.', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;

-- Path convention: {owner_id}/{yyyy}/{mm}/{uuid}.{ext}
-- Policies: best-effort (may also need storage admin on some projects)

DO $$
BEGIN
  -- venue-media
  DROP POLICY IF EXISTS "venue_media_public_read" ON storage.objects;
  CREATE POLICY "venue_media_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'venue-media');

  DROP POLICY IF EXISTS "venue_media_owner_insert" ON storage.objects;
  CREATE POLICY "venue_media_owner_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_owner_update" ON storage.objects;
  CREATE POLICY "venue_media_owner_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_owner_delete" ON storage.objects;
  CREATE POLICY "venue_media_owner_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- venue-media-private
  DROP POLICY IF EXISTS "venue_media_private_owner_select" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_private_owner_insert" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_private_owner_update" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_private_owner_delete" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- admin-assets
  DROP POLICY IF EXISTS "admin_assets_public_read" ON storage.objects;
  CREATE POLICY "admin_assets_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'admin-assets');

  DROP POLICY IF EXISTS "admin_assets_admin_write" ON storage.objects;
  CREATE POLICY "admin_assets_admin_write"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'admin-assets' AND public.is_platform_admin());

  DROP POLICY IF EXISTS "admin_assets_admin_update" ON storage.objects;
  CREATE POLICY "admin_assets_admin_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'admin-assets' AND public.is_platform_admin())
    WITH CHECK (bucket_id = 'admin-assets' AND public.is_platform_admin());

  DROP POLICY IF EXISTS "admin_assets_admin_delete" ON storage.objects;
  CREATE POLICY "admin_assets_admin_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'admin-assets' AND public.is_platform_admin());

  -- documents
  DROP POLICY IF EXISTS "documents_owner_select" ON storage.objects;
  CREATE POLICY "documents_owner_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "documents_owner_insert" ON storage.objects;
  CREATE POLICY "documents_owner_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "documents_owner_update" ON storage.objects;
  CREATE POLICY "documents_owner_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "documents_owner_delete" ON storage.objects;
  CREATE POLICY "documents_owner_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped storage.objects policies (42501). Add policies in Dashboard → Storage after creating buckets.';
  WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'Skipped storage.objects policies (%).', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;


-- <<< 202607250003_create_storage_buckets.sql


-- >>> 202607250004_create_catalog_tables.sql

-- =============================================================================
-- 202607250004 — Normalized catalog (parallel to venues.data JSON blob)
-- Backwards compatible: JSON remains source of truth until app cutover.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  legacy_id     text, -- original JSON id for migration mapping
  name          text NOT NULL,
  name_en       text,
  icon          text,
  sort_order    integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  status        public.catalog_entity_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT menu_categories_name_len CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_owner_legacy_uidx
  ON public.menu_categories (owner_id, legacy_id)
  WHERE legacy_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_categories_owner_sort_idx
  ON public.menu_categories (owner_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.menu_crops (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  legacy_id       text,
  bean_name       text NOT NULL,
  bean_name_en    text,
  country         text,
  country_en      text,
  process         text,
  process_en      text,
  variety         text,
  altitude        text,
  notes           text,
  notes_en        text,
  region          text,
  farm            text,
  producer        text,
  roast_level     text,
  roast_date      text,
  description     text,
  description_en  text,
  aroma           text,
  aroma_en        text,
  acidity         text,
  acidity_en      text,
  body            text,
  body_en         text,
  sweetness       text,
  sweetness_en    text,
  brewing         jsonb NOT NULL DEFAULT '{}'::jsonb,
  card_color      text,
  text_color      text,
  bg_type         text CHECK (bg_type IS NULL OR bg_type IN ('color','gradient','image')),
  gradient_colors jsonb,
  sort_order      integer NOT NULL DEFAULT 0,
  status          public.catalog_entity_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT menu_crops_bean_name_len CHECK (char_length(bean_name) BETWEEN 1 AND 160)
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_crops_owner_legacy_uidx
  ON public.menu_crops (owner_id, legacy_id)
  WHERE legacy_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_crops_owner_sort_idx
  ON public.menu_crops (owner_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_crops_name_trgm_idx
  ON public.menu_crops USING gin (bean_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.menu_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id      uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  crop_id          uuid REFERENCES public.menu_crops(id) ON DELETE SET NULL,
  legacy_id        text,
  name             text NOT NULL,
  name_en          text,
  description      text,
  description_en   text,
  price            numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  calories         integer CHECK (calories IS NULL OR calories >= 0),
  badge_text       text,
  badge_text_en    text,
  badge_color      text,
  crop_info        jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order       integer NOT NULL DEFAULT 0,
  status           public.catalog_entity_status NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT menu_products_name_len CHECK (char_length(name) BETWEEN 1 AND 160)
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_products_owner_legacy_uidx
  ON public.menu_products (owner_id, legacy_id)
  WHERE legacy_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_products_owner_category_idx
  ON public.menu_products (owner_id, category_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_products_crop_idx
  ON public.menu_products (crop_id)
  WHERE deleted_at IS NULL AND crop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS menu_products_name_trgm_idx
  ON public.menu_products USING gin (name gin_trgm_ops);

-- Options / variants (future-ready; unused by UI today)
CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  name_en       text,
  min_select    integer NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select    integer CHECK (max_select IS NULL OR max_select >= 0),
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE IF NOT EXISTS public.product_options (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name          text NOT NULL,
  name_en       text,
  price_delta   numeric(12,2) NOT NULL DEFAULT 0,
  is_default    boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sku           text,
  name          text NOT NULL,
  name_en       text,
  price         numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_default    boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  status        public.catalog_entity_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_owner_sku_uidx
  ON public.product_variants (owner_id, sku)
  WHERE sku IS NOT NULL AND deleted_at IS NULL;

-- Allergens
CREATE TABLE IF NOT EXISTS public.allergens (
  code          text PRIMARY KEY,
  name_ar       text NOT NULL,
  name_en       text NOT NULL,
  icon          text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.product_allergens (
  product_id    uuid NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  allergen_code text NOT NULL REFERENCES public.allergens(code) ON DELETE CASCADE,
  PRIMARY KEY (product_id, allergen_code)
);

INSERT INTO public.allergens (code, name_ar, name_en, sort_order) VALUES
  ('gluten', 'جلوتين', 'Gluten', 1),
  ('dairy', 'ألبان', 'Dairy', 2),
  ('eggs', 'بيض', 'Eggs', 3),
  ('nuts', 'مكسرات', 'Nuts', 4),
  ('peanuts', 'فول سوداني', 'Peanuts', 5),
  ('soy', 'صويا', 'Soy', 6),
  ('sesame', 'سمسم', 'Sesame', 7),
  ('fish', 'سمك', 'Fish', 8),
  ('shellfish', 'محار', 'Shellfish', 9),
  ('mustard', 'خردل', 'Mustard', 10)
ON CONFLICT (code) DO NOTHING;

-- Venue theme settings (typed companion to menuSettings JSON)
CREATE TABLE IF NOT EXISTS public.venue_theme_settings (
  owner_id      uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft         jsonb,
  published_at  timestamptz,
  schema_version integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Triggers
DO $$ BEGIN
  CREATE TRIGGER menu_categories_updated_at BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER menu_crops_updated_at BEFORE UPDATE ON public.menu_crops
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER menu_products_updated_at BEFORE UPDATE ON public.menu_products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER product_option_groups_updated_at BEFORE UPDATE ON public.product_option_groups
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER product_variants_updated_at BEFORE UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER venue_theme_settings_updated_at BEFORE UPDATE ON public.venue_theme_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.menu_products IS
  'Normalized products; dual-write/read with venues.data until cutover complete';
COMMENT ON TABLE public.venue_theme_settings IS
  'Typed theme settings; mirrors menuSettings with optional draft + publish';


-- <<< 202607250004_create_catalog_tables.sql


-- >>> 202607250005_create_cms_tables.sql

-- =============================================================================
-- 202607250005 — CMS / marketing content tables (platform + optional per-locale)
-- Additive; landing currently hardcoded — tables enable future CMS admin.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.landing_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  title         text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  status        public.publish_status NOT NULL DEFAULT 'draft',
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at    timestamptz,
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS public.pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  title         text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  status        public.publish_status NOT NULL DEFAULT 'draft',
  excerpt       text,
  body_markdown text,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at    timestamptz,
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS public.page_blocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  block_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_blocks_page_sort_idx
  ON public.page_blocks (page_id, sort_order);

CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key   text NOT NULL, -- hero|features|pricing|faq|cta|footer
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  title         text,
  subtitle      text,
  body          text,
  cta_label     text,
  cta_href      text,
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (section_key, locale)
);

CREATE TABLE IF NOT EXISTS public.hero_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key      text NOT NULL DEFAULT 'home',
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  headline      text NOT NULL,
  subheadline   text,
  cta_primary_label text,
  cta_primary_href  text,
  cta_secondary_label text,
  cta_secondary_href  text,
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status        public.publish_status NOT NULL DEFAULT 'draft',
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, locale, sort_order)
);

CREATE TABLE IF NOT EXISTS public.sliders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  status        public.publish_status NOT NULL DEFAULT 'draft',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.slider_slides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slider_id     uuid NOT NULL REFERENCES public.sliders(id) ON DELETE CASCADE,
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  title         text,
  subtitle      text,
  href          text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  href          text,
  placement     text NOT NULL DEFAULT 'home',
  status        public.publish_status NOT NULL DEFAULT 'draft',
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  body          text,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  severity      text NOT NULL DEFAULT 'info',
  status        public.publish_status NOT NULL DEFAULT 'draft',
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faq_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_en       text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid REFERENCES public.faq_categories(id) ON DELETE SET NULL,
  question      text NOT NULL,
  question_en   text,
  answer        text NOT NULL,
  answer_en     text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name   text NOT NULL,
  author_title  text,
  company       text,
  quote         text NOT NULL,
  quote_en      text,
  rating        numeric(2,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  website_url   text,
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  role_title    text,
  bio           text,
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  name_en       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blogs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  slug          text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  title         text NOT NULL,
  excerpt       text,
  body_markdown text,
  cover_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status        public.publish_status NOT NULL DEFAULT 'draft',
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS public.news (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  title         text NOT NULL,
  body_markdown text,
  status        public.publish_status NOT NULL DEFAULT 'draft',
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS public.popups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  title         text,
  body          text,
  cta_label     text,
  cta_href      text,
  media_id      uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status        public.publish_status NOT NULL DEFAULT 'draft',
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL, -- page|blog|landing|home
  entity_id       uuid,
  locale          public.locale_code NOT NULL DEFAULT 'ar',
  path            text,
  meta_title      text,
  meta_description text,
  og_title        text,
  og_description  text,
  og_image_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  canonical_url   text,
  robots          text DEFAULT 'index,follow',
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_metadata_entity_locale_uidx
  ON public.seo_metadata (
    entity_type,
    COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
    locale
  );

COMMENT ON TABLE public.faqs IS 'CMS FAQs; seed from hardcoded FAQ.tsx when enabling admin CMS';


-- <<< 202607250005_create_cms_tables.sql


-- >>> 202607250006_create_settings_i18n.sql

-- =============================================================================
-- 202607250006 — System settings, i18n, feature flags, notification config
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  key           text PRIMARY KEY,
  value         jsonb NOT NULL DEFAULT 'null'::jsonb,
  description   text,
  is_secret     boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.website_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name     text NOT NULL DEFAULT 'Meez',
  support_email text,
  support_whatsapp text,
  default_locale public.locale_code NOT NULL DEFAULT 'ar',
  timezone      text NOT NULL DEFAULT 'Asia/Riyadh',
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Singleton guard: only one website_settings row intended
CREATE UNIQUE INDEX IF NOT EXISTS website_settings_singleton_uidx
  ON public.website_settings ((true));

CREATE TABLE IF NOT EXISTS public.branding (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  favicon_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  primary_color text,
  secondary_color text,
  accent_color  text,
  font_display  text,
  font_body     text,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS branding_singleton_uidx
  ON public.branding ((true));

CREATE TABLE IF NOT EXISTS public.theme_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         text NOT NULL DEFAULT 'marketing', -- marketing|dashboard
  tokens        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope)
);

CREATE TABLE IF NOT EXISTS public.email_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL DEFAULT 'supabase',
  from_email    text,
  from_name     text,
  reply_to      text,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled    boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_settings_singleton_uidx
  ON public.email_settings ((true));

CREATE TABLE IF NOT EXISTS public.sms_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text,
  sender_id     text,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled    boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sms_settings_singleton_uidx
  ON public.sms_settings ((true));

CREATE TABLE IF NOT EXISTS public.storage_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_public_bucket  text NOT NULL DEFAULT 'venue-media',
  default_private_bucket text NOT NULL DEFAULT 'venue-media-private',
  max_upload_bytes bigint NOT NULL DEFAULT 10485760,
  prefer_webp   boolean NOT NULL DEFAULT true,
  prefer_avif   boolean NOT NULL DEFAULT false,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS storage_settings_singleton_uidx
  ON public.storage_settings ((true));

CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text, -- ga4|posthog|none
  measurement_id text,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled    boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_settings_singleton_uidx
  ON public.analytics_settings ((true));

CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled    boolean NOT NULL DEFAULT false,
  message_ar    text,
  message_en    text,
  allow_admin   boolean NOT NULL DEFAULT true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_settings_singleton_uidx
  ON public.maintenance_settings ((true));

-- Ensure columns exist when tables were created earlier with a thinner schema
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS site_name text NOT NULL DEFAULT 'Meez',
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS support_whatsapp text,
  ADD COLUMN IF NOT EXISTS default_locale public.locale_code NOT NULL DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.branding
  ADD COLUMN IF NOT EXISTS logo_media_id uuid,
  ADD COLUMN IF NOT EXISTS favicon_media_id uuid,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS font_display text,
  ADD COLUMN IF NOT EXISTS font_body text,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.email_settings
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS reply_to text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.sms_settings
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS sender_id text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.storage_settings
  ADD COLUMN IF NOT EXISTS default_public_bucket text NOT NULL DEFAULT 'venue-media',
  ADD COLUMN IF NOT EXISTS default_private_bucket text NOT NULL DEFAULT 'venue-media-private',
  ADD COLUMN IF NOT EXISTS max_upload_bytes bigint NOT NULL DEFAULT 10485760,
  ADD COLUMN IF NOT EXISTS prefer_webp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prefer_avif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.analytics_settings
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS measurement_id text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.maintenance_settings
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_ar text,
  ADD COLUMN IF NOT EXISTS message_en text,
  ADD COLUMN IF NOT EXISTS allow_admin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key           text PRIMARY KEY,
  description   text,
  is_enabled    boolean NOT NULL DEFAULT false,
  audience      text NOT NULL DEFAULT 'all', -- all|admin|beta|owner
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.languages (
  code          public.locale_code PRIMARY KEY,
  name_native   text NOT NULL,
  name_en       text NOT NULL,
  is_default    boolean NOT NULL DEFAULT false,
  is_enabled    boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0
);

INSERT INTO public.languages (code, name_native, name_en, is_default, is_enabled, sort_order) VALUES
  ('ar', 'العربية', 'Arabic', true, true, 1),
  ('en', 'English', 'English', false, true, 2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.translations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace     text NOT NULL DEFAULT 'app',
  key           text NOT NULL,
  locale        public.locale_code NOT NULL,
  value         text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, locale)
);

CREATE INDEX IF NOT EXISTS translations_ns_locale_idx
  ON public.translations (namespace, locale);

-- Notification templates + outbox
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key  text NOT NULL,
  channel       public.notification_channel NOT NULL,
  locale        public.locale_code NOT NULL DEFAULT 'ar',
  subject       text,
  body          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, channel, locale)
);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  channel       public.notification_channel NOT NULL,
  template_key  text,
  to_address    text NOT NULL,
  subject       text,
  body          text NOT NULL,
  status        public.notification_status NOT NULL DEFAULT 'pending',
  attempts      integer NOT NULL DEFAULT 0,
  last_error    text,
  scheduled_at  timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_outbox_status_sched_idx
  ON public.notification_outbox (status, scheduled_at)
  WHERE status IN ('pending', 'queued', 'failed');

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token         text NOT NULL,
  platform      text, -- ios|android|web
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz,
  UNIQUE (owner_id, token)
);

-- Seed critical config (non-secret)
INSERT INTO public.system_config (key, value, description) VALUES
  ('trial_days', '7'::jsonb, 'Signup trial length in days — single source of truth'),
  ('rate_limit.kiosk.window_seconds', '60'::jsonb, 'Kiosk rate-limit window'),
  ('rate_limit.kiosk.max_attempts', '30'::jsonb, 'Kiosk rate-limit max attempts per window'),
  ('media.max_upload_bytes', '10485760'::jsonb, 'Default max upload size'),
  ('catalog.dual_write_json', 'true'::jsonb, 'Keep writing venues.data while normalized tables fill')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.feature_flags (key, description, is_enabled, audience) VALUES
  ('media_storage_uploads', 'Use Supabase Storage instead of Base64', false, 'beta'),
  ('normalized_catalog', 'Read/write menu_products tables', false, 'beta'),
  ('cms_admin', 'Enable CMS editing in admin', false, 'admin'),
  ('maintenance_banner', 'Show maintenance banner', false, 'all')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.website_settings (site_name, default_locale, timezone)
SELECT 'Meez', 'ar', 'Asia/Riyadh'
WHERE NOT EXISTS (SELECT 1 FROM public.website_settings);

-- Singleton seeds: best-effort (legacy email_settings may require smtp_server, etc.)
DO $$
DECLARE
  has_smtp boolean;
BEGIN
  -- storage_settings
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.storage_settings) THEN
      INSERT INTO public.storage_settings (
        default_public_bucket, default_private_bucket, max_upload_bytes, prefer_webp, prefer_avif, config
      ) VALUES ('venue-media', 'venue-media-private', 10485760, true, false, '{}'::jsonb);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped storage_settings seed: %', SQLERRM;
  END;

  -- maintenance_settings
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.maintenance_settings) THEN
      INSERT INTO public.maintenance_settings (is_enabled, allow_admin)
      VALUES (false, true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped maintenance_settings seed: %', SQLERRM;
  END;

  -- email_settings (legacy DBs often have smtp_server NOT NULL)
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.email_settings) THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'email_settings'
          AND column_name = 'smtp_server'
      ) INTO has_smtp;

      IF has_smtp THEN
        EXECUTE $q$
          INSERT INTO public.email_settings (smtp_server, provider, is_enabled, config)
          VALUES ('', 'supabase', true, '{}'::jsonb)
        $q$;
      ELSE
        INSERT INTO public.email_settings (provider, is_enabled, config)
        VALUES ('supabase', true, '{}'::jsonb);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped email_settings seed: %', SQLERRM;
  END;

  -- sms_settings
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.sms_settings) THEN
      INSERT INTO public.sms_settings (is_enabled, config)
      VALUES (false, '{}'::jsonb);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped sms_settings seed: %', SQLERRM;
  END;

  -- analytics_settings
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.analytics_settings) THEN
      INSERT INTO public.analytics_settings (is_enabled, config)
      VALUES (false, '{}'::jsonb);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped analytics_settings seed: %', SQLERRM;
  END;

  -- branding
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.branding) THEN
      INSERT INTO public.branding (payload) VALUES ('{}'::jsonb);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped branding seed: %', SQLERRM;
  END;
END $$;

-- <<< 202607250006_create_settings_i18n.sql


-- >>> 202607250007_create_security_tables.sql

-- =============================================================================
-- 202607250007 — Security: permissions, members, API keys, login/security logs
-- Enhances existing audit_logs; does NOT drop or recreate it.
-- =============================================================================

-- Venue team members (activates unused profiles.role staff path)
CREATE TABLE IF NOT EXISTS public.venue_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          public.venue_member_role NOT NULL DEFAULT 'staff',
  invited_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, user_id),
  CONSTRAINT venue_members_not_self_owner CHECK (owner_id <> user_id OR role = 'owner')
);

CREATE INDEX IF NOT EXISTS venue_members_user_idx
  ON public.venue_members (user_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.permissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource      text NOT NULL, -- products|crops|devices|theme|billing|media|cms
  action        public.permission_action NOT NULL,
  description   text,
  UNIQUE (resource, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role          public.venue_member_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

INSERT INTO public.permissions (resource, action, description) VALUES
  ('products', 'create', 'Create products'),
  ('products', 'read', 'Read products'),
  ('products', 'update', 'Update products'),
  ('products', 'delete', 'Delete products'),
  ('crops', 'create', 'Create crops'),
  ('crops', 'read', 'Read crops'),
  ('crops', 'update', 'Update crops'),
  ('crops', 'delete', 'Delete crops'),
  ('devices', 'manage', 'Manage devices'),
  ('theme', 'update', 'Update theme'),
  ('media', 'manage', 'Manage media library'),
  ('billing', 'read', 'View subscription'),
  ('settings', 'manage', 'Manage venue settings')
ON CONFLICT (resource, action) DO NOTHING;

-- Map manager/editor/viewer defaults
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::public.venue_member_role, p.id FROM public.permissions p
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'editor'::public.venue_member_role, p.id
FROM public.permissions p
WHERE p.resource IN ('products','crops','theme','media')
  AND p.action IN ('create','read','update')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer'::public.venue_member_role, p.id
FROM public.permissions p
WHERE p.action = 'read'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  key_prefix    text NOT NULL,
  key_hash      text NOT NULL,
  scopes        text[] NOT NULL DEFAULT '{}',
  last_used_at  timestamptz,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_prefix_len CHECK (char_length(key_prefix) BETWEEN 4 AND 16)
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_uidx ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_owner_idx ON public.api_keys (owner_id) WHERE revoked_at IS NULL;

-- App-level session inventory (Supabase Auth remains source of truth for JWTs)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    text,
  ip            inet,
  user_agent    text,
  device_label  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx
  ON public.user_sessions (user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.login_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text,
  success       boolean NOT NULL,
  fail_reason   text,
  ip            inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_history_user_idx
  ON public.login_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS login_history_created_idx
  ON public.login_history (created_at DESC);

CREATE TABLE IF NOT EXISTS public.security_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  severity      public.security_event_severity NOT NULL DEFAULT 'info',
  message       text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_severity_idx
  ON public.security_events (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS security_events_owner_idx
  ON public.security_events (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity_type   text,
  entity_id     uuid,
  summary       text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_owner_idx
  ON public.activity_logs (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_actor_idx
  ON public.activity_logs (actor_id, created_at DESC);

-- Enhance existing audit_logs (additive columns only)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS ip inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS severity public.security_event_severity DEFAULT 'info';

-- FK for subscription_history.changed_by (safe if column exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_history' AND column_name = 'changed_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscription_history_changed_by_fkey'
  ) THEN
    ALTER TABLE public.subscription_history
      ADD CONSTRAINT subscription_history_changed_by_fkey
      FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'subscription_history.changed_by FK skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  CREATE TRIGGER venue_members_updated_at BEFORE UPDATE ON public.venue_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.venue_members IS
  'Multi-user venue access; complements profiles.role staff';
COMMENT ON TABLE public.activity_logs IS
  'Owner-facing activity history distinct from security audit_logs';


-- <<< 202607250007_create_security_tables.sql


-- >>> 202607250008_create_documents.sql

-- =============================================================================
-- 202607250008 — Documents / attachments file management
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.document_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  slug          text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_categories_owner_idx
  ON public.document_categories (owner_id);

CREATE TABLE IF NOT EXISTS public.documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  mime_type       text NOT NULL,
  file_size       bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  storage_bucket  text NOT NULL DEFAULT 'documents',
  storage_path    text NOT NULL,
  status          public.document_status NOT NULL DEFAULT 'active',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT documents_path_nonempty CHECK (char_length(storage_path) > 0)
);

CREATE INDEX IF NOT EXISTS documents_owner_idx
  ON public.documents (owner_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS documents_bucket_path_uidx
  ON public.documents (storage_bucket, storage_path)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.document_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number  integer NOT NULL CHECK (version_number > 0),
  storage_bucket  text NOT NULL,
  storage_path    text NOT NULL,
  mime_type       text NOT NULL,
  file_size       bigint NOT NULL DEFAULT 0,
  change_note     text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  document_id     uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  media_id        uuid REFERENCES public.media_assets(id) ON DELETE CASCADE,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_has_target CHECK (document_id IS NOT NULL OR media_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS attachments_entity_idx
  ON public.attachments (entity_type, entity_id);

DO $$ BEGIN
  CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.documents IS
  'Private document vault (PDFs/contracts) in Storage bucket documents';


-- <<< 202607250008_create_documents.sql


-- >>> 202607250009_enhance_existing_tables.sql

-- =============================================================================
-- 202607250009 — Enhance existing core tables (additive columns only)
-- =============================================================================

-- Profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale public.locale_code DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Riyadh',
  ADD COLUMN IF NOT EXISTS avatar_media_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_avatar_media_fkey
    FOREIGN KEY (avatar_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- Soft phone format hint (nullable for legacy rows)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_format_chk
    CHECK (
      phone IS NULL
      OR phone ~ '^\+?[0-9][0-9\s\-]{7,20}$'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Venues: catalog sync metadata (keep data JSONB intact)
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS catalog_schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS media_migrated_at timestamptz,
  ADD COLUMN IF NOT EXISTS normalized_catalog_at timestamptz;

-- Device activations: optional app metadata
ALTER TABLE public.device_activations
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS os_name text,
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS last_ip inet;

COMMENT ON COLUMN public.venues.media_migrated_at IS
  'Set when Base64 images have been copied to Storage + media_assets';
COMMENT ON COLUMN public.venues.normalized_catalog_at IS
  'Set when JSON catalog has been projected into menu_* tables';


-- <<< 202607250009_enhance_existing_tables.sql


-- >>> 202607250010_rls_policies.sql

-- =============================================================================
-- 202607250010 — RLS policies for new tables (owner + platform admin)
-- Idempotent via DROP POLICY IF EXISTS + CREATE POLICY
-- =============================================================================

-- Helper: enable RLS on a list of tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'media_folders','media_assets','media_variants','media_tags','media_tag_links',
    'media_collections','media_collection_items','media_usage','media_versions',
    'menu_categories','menu_crops','menu_products','product_option_groups',
    'product_options','product_variants','allergens','product_allergens',
    'venue_theme_settings',
    'landing_pages','pages','page_blocks','homepage_sections','hero_sections',
    'sliders','slider_slides','banners','cms_announcements','faq_categories','faqs',
    'testimonials','partners','team_members','blog_categories','blogs','news','popups',
    'seo_metadata',
    'system_config','website_settings','branding','theme_settings','email_settings',
    'sms_settings','storage_settings','analytics_settings','maintenance_settings',
    'feature_flags','languages','translations','notification_templates',
    'notification_outbox','push_tokens',
    'venue_members','permissions','role_permissions','api_keys','user_sessions',
    'login_history','security_events','activity_logs',
    'document_categories','documents','document_versions','attachments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Generic owner CRUD macro via DO blocks per table with owner_id
DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'media_folders','media_assets','media_tags','media_collections','media_usage',
    'menu_categories','menu_crops','menu_products','product_option_groups',
    'product_variants','venue_theme_settings','push_tokens','api_keys',
    'venue_members','document_categories','documents','attachments',
    'notification_outbox','activity_logs'
  ]
  LOOP
    pol := t || '_select_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );

    pol := t || '_insert_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );

    pol := t || '_update_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_platform_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );

    pol := t || '_delete_own';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_platform_admin())',
      pol, t
    );
  END LOOP;
END $$;

-- media_variants: via parent asset ownership
DROP POLICY IF EXISTS media_variants_select_own ON public.media_variants;
CREATE POLICY media_variants_select_own ON public.media_variants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_variants.asset_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_variants_mutate_own ON public.media_variants;
CREATE POLICY media_variants_mutate_own ON public.media_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_variants.asset_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_variants.asset_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_versions_select_own ON public.media_versions;
CREATE POLICY media_versions_select_own ON public.media_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_versions.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_versions_mutate_own ON public.media_versions;
CREATE POLICY media_versions_mutate_own ON public.media_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_versions.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_versions.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_tag_links_via_media ON public.media_tag_links;
CREATE POLICY media_tag_links_via_media ON public.media_tag_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_tag_links.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets a
      WHERE a.id = media_tag_links.media_id
        AND (a.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS media_collection_items_via_collection ON public.media_collection_items;
CREATE POLICY media_collection_items_via_collection ON public.media_collection_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_collections c
      WHERE c.id = media_collection_items.collection_id
        AND (c.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_collections c
      WHERE c.id = media_collection_items.collection_id
        AND (c.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

-- product_options via group/product
DROP POLICY IF EXISTS product_options_via_group ON public.product_options;
CREATE POLICY product_options_via_group ON public.product_options
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_option_groups g
      WHERE g.id = product_options.group_id
        AND (g.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.product_option_groups g
      WHERE g.id = product_options.group_id
        AND (g.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS product_allergens_via_product ON public.product_allergens;
CREATE POLICY product_allergens_via_product ON public.product_allergens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_products p
      WHERE p.id = product_allergens.product_id
        AND (p.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_products p
      WHERE p.id = product_allergens.product_id
        AND (p.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );

-- Allergens catalog: readable by all authenticated; admin write
DROP POLICY IF EXISTS allergens_read_all ON public.allergens;
CREATE POLICY allergens_read_all ON public.allergens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS allergens_admin_write ON public.allergens;
CREATE POLICY allergens_admin_write ON public.allergens
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- CMS / settings: public read for published marketing; admin write
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'landing_pages','pages','homepage_sections','hero_sections','sliders','banners',
    'cms_announcements','faqs','faq_categories','testimonials','partners','team_members',
    'blog_categories','blogs','news','popups','seo_metadata','languages','translations',
    'feature_flags'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t || '_public_read', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())',
      t || '_admin_write', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS page_blocks_public_read ON public.page_blocks;
CREATE POLICY page_blocks_public_read ON public.page_blocks
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS page_blocks_admin_write ON public.page_blocks;
CREATE POLICY page_blocks_admin_write ON public.page_blocks
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS slider_slides_public_read ON public.slider_slides;
CREATE POLICY slider_slides_public_read ON public.slider_slides
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS slider_slides_admin_write ON public.slider_slides;
CREATE POLICY slider_slides_admin_write ON public.slider_slides
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Platform settings: admin only
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'system_config','website_settings','branding','theme_settings','email_settings',
    'sms_settings','storage_settings','analytics_settings','maintenance_settings',
    'notification_templates','permissions','role_permissions'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())',
      t || '_admin_all', t
    );
    -- authenticated can read non-secret feature flags / languages already covered
  END LOOP;
END $$;

-- system_config: owners may read non-secret keys
DROP POLICY IF EXISTS system_config_read_nonsecret ON public.system_config;
CREATE POLICY system_config_read_nonsecret ON public.system_config
  FOR SELECT TO authenticated
  USING (is_secret = false OR public.is_platform_admin());

-- Sessions / login / security: self or admin
DROP POLICY IF EXISTS user_sessions_own ON public.user_sessions;
CREATE POLICY user_sessions_own ON public.user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS login_history_own ON public.login_history;
CREATE POLICY login_history_own ON public.login_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS security_events_own ON public.security_events;
CREATE POLICY security_events_own ON public.security_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS document_versions_via_doc ON public.document_versions;
CREATE POLICY document_versions_via_doc ON public.document_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (d.owner_id = auth.uid() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (d.owner_id = auth.uid() OR public.is_platform_admin())
    )
  );


-- <<< 202607250010_rls_policies.sql


-- >>> 202607250011_views_and_matviews.sql

-- =============================================================================
-- 202607250011 — Views + materialized views for admin/reporting
-- Ensures device_activations.status exists (older DBs may lack it)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.device_license_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Older Meez DBs created device_activations without status
ALTER TABLE public.device_activations
  ADD COLUMN IF NOT EXISTS status public.device_license_status;

-- Backfill then enforce default (safe if column already populated)
UPDATE public.device_activations
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.device_activations
  ALTER COLUMN status SET DEFAULT 'active';

DO $$
BEGIN
  ALTER TABLE public.device_activations
    ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'device_activations.status NOT NULL skipped: %', SQLERRM;
END $$;

CREATE OR REPLACE VIEW public.v_owner_catalog_counts
WITH (security_invoker = true)
AS
SELECT
  p.id AS owner_id,
  p.venue_name,
  (SELECT count(*) FROM public.menu_categories c WHERE c.owner_id = p.id AND c.deleted_at IS NULL) AS category_count,
  (SELECT count(*) FROM public.menu_products pr WHERE pr.owner_id = p.id AND pr.deleted_at IS NULL) AS product_count,
  (SELECT count(*) FROM public.menu_crops cr WHERE cr.owner_id = p.id AND cr.deleted_at IS NULL) AS crop_count,
  (SELECT count(*) FROM public.media_assets m WHERE m.owner_id = p.id AND m.deleted_at IS NULL) AS media_count,
  (SELECT count(*) FROM public.device_activations d WHERE d.owner_id = p.id AND d.status = 'active') AS active_device_count
FROM public.profiles p;

COMMENT ON VIEW public.v_owner_catalog_counts IS
  'Per-owner catalog/media/device counts (normalized tables)';

CREATE OR REPLACE VIEW public.v_media_ready
WITH (security_invoker = true)
AS
SELECT
  m.*,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'role', v.role,
        'breakpoint', v.breakpoint,
        'format', v.format,
        'pixel_density', v.pixel_density,
        'public_url', v.public_url,
        'width', v.width,
        'height', v.height
      )
      ORDER BY v.pixel_density, v.format
    )
    FROM public.media_variants v
    WHERE v.asset_id = m.id AND v.deleted_at IS NULL
  ) AS variants
FROM public.media_assets m
WHERE m.deleted_at IS NULL
  AND m.status = 'ready';

-- Materialized admin rollup (skip/replace safely)
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_platform_stats;

CREATE MATERIALIZED VIEW public.mv_admin_platform_stats AS
SELECT
  (SELECT count(*) FROM public.profiles) AS total_owners,
  (SELECT count(*) FROM public.subscriptions s WHERE s.status::text = 'trial') AS trial_count,
  (SELECT count(*) FROM public.subscriptions s WHERE s.status::text = 'active') AS active_count,
  (SELECT count(*) FROM public.subscriptions s WHERE s.status::text = 'expired') AS expired_count,
  (SELECT count(*) FROM public.device_activations d WHERE d.status = 'active') AS active_devices,
  (SELECT count(*) FROM public.media_assets WHERE deleted_at IS NULL) AS media_assets_total,
  (SELECT coalesce(sum(file_size), 0) FROM public.media_assets WHERE deleted_at IS NULL) AS media_bytes_total,
  now() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_platform_stats_singleton
  ON public.mv_admin_platform_stats ((true));

CREATE OR REPLACE FUNCTION public.refresh_admin_platform_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_platform_stats;
END;
$$;


-- <<< 202607250011_views_and_matviews.sql


-- >>> 202607250012_functions_triggers.sql

-- =============================================================================
-- 202607250012 — Helper functions: config, activity, media register, soft delete
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_system_config(p_key text, p_default jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT value FROM public.system_config WHERE key = p_key AND (is_secret = false OR public.is_platform_admin())),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION public.get_trial_days()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((public.get_system_config('trial_days', '7'::jsonb))::text::integer, 7);
$$;

CREATE OR REPLACE FUNCTION public.write_activity_log(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.activity_logs (owner_id, actor_id, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_media_asset(
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_role public.media_role DEFAULT 'original',
  p_width integer DEFAULT NULL,
  p_height integer DEFAULT NULL,
  p_bucket text DEFAULT 'venue-media',
  p_public_url text DEFAULT NULL,
  p_original_filename text DEFAULT NULL,
  p_alt_text text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.media_assets (
    owner_id, role, status, visibility, mime_type, file_size, width, height,
    storage_bucket, storage_path, public_url, original_filename, alt_text,
    metadata, uploaded_by, created_by, updated_by
  ) VALUES (
    auth.uid(), p_role, 'ready', 'public', p_mime_type, coalesce(p_file_size, 0),
    p_width, p_height, p_bucket, p_storage_path, p_public_url, p_original_filename,
    p_alt_text, coalesce(p_metadata, '{}'::jsonb), auth.uid(), auth.uid(), auth.uid()
  )
  RETURNING id INTO v_id;

  PERFORM public.write_activity_log('media.upload', 'media_asset', v_id, p_original_filename);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_media_asset(p_media_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.media_assets
  SET deleted_at = now(), status = 'deleted', updated_by = auth.uid(), updated_at = now()
  WHERE id = p_media_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

-- JSON blob product count (for DBs that never applied admin customers migration)
CREATE OR REPLACE FUNCTION public.venue_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE
      WHEN jsonb_typeof(v.data->'products') = 'array'
        THEN jsonb_array_length(v.data->'products')
      ELSE 0
    END,
    0
  )::integer
  FROM public.venues v
  WHERE v.owner_id = p_owner_id
  LIMIT 1;
$$;

-- Prefer normalized menu_products; fall back to venues.data JSON
CREATE OR REPLACE FUNCTION public.owner_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.menu_products mp
      WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
    ) THEN (
      SELECT count(*)::integer FROM public.menu_products mp
      WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
    )
    ELSE COALESCE(public.venue_product_count(p_owner_id), 0)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_config(text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_days() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.write_activity_log(text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_media_asset(
  text, text, bigint, public.media_role, integer, integer, text, text, text, text, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.venue_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_admin_platform_stats() TO authenticated;

COMMENT ON FUNCTION public.register_media_asset IS
  'Register Storage upload metadata after client upload; replaces Base64 persistence';
COMMENT ON FUNCTION public.get_trial_days IS
  'Single source of truth for trial length (system_config.trial_days)';
COMMENT ON FUNCTION public.venue_product_count IS
  'Count products inside venues.data JSONB (legacy blob)';


-- <<< 202607250012_functions_triggers.sql


-- >>> 202607250013_indexes_performance.sql

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


-- <<< 202607250013_indexes_performance.sql

