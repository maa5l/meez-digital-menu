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