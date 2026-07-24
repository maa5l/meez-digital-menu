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
