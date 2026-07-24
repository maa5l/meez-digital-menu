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
