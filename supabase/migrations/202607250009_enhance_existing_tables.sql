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
