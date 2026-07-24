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
