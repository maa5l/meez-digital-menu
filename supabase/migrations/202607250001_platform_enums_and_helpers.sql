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
