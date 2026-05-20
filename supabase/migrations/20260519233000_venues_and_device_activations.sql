-- ============================================================
-- بيانات المنشأة (تصنيفات، منتجات، محاصيل، أجهزة، ثيم)
-- + تفعيل الأجهزة للعرض على الشاشات
-- ============================================================

-- 1) بيانات المنشأة لكل مالك (JSONB — يطابق VenueData في التطبيق)
CREATE TABLE IF NOT EXISTS public.venues (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venues_updated_at_idx ON public.venues (updated_at DESC);

DROP TRIGGER IF EXISTS venues_updated_at ON public.venues;
CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2) تفعيل الأجهزة
CREATE TABLE IF NOT EXISTS public.device_activations (
  code TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  menu_type TEXT CHECK (menu_type IS NULL OR menu_type IN ('products', 'crops')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS device_activations_owner_idx ON public.device_activations (owner_id);

-- 3) RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select_own" ON public.venues;
CREATE POLICY "venues_select_own"
  ON public.venues FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_insert_own" ON public.venues;
CREATE POLICY "venues_insert_own"
  ON public.venues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_update_own" ON public.venues;
CREATE POLICY "venues_update_own"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_delete_own" ON public.venues;
CREATE POLICY "venues_delete_own"
  ON public.venues FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_select_own" ON public.device_activations;
CREATE POLICY "device_activations_select_own"
  ON public.device_activations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_insert_own" ON public.device_activations;
CREATE POLICY "device_activations_insert_own"
  ON public.device_activations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_update_own" ON public.device_activations;
CREATE POLICY "device_activations_update_own"
  ON public.device_activations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_delete_own" ON public.device_activations;
CREATE POLICY "device_activations_delete_own"
  ON public.device_activations FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 4) دوال آمنة للعرض على الأجهزة (بدون auth)
CREATE OR REPLACE FUNCTION public.get_venue_for_device(device_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.data
  FROM public.device_activations da
  JOIN public.venues v ON v.owner_id = da.owner_id
  WHERE upper(trim(da.code)) = upper(trim(device_code))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_device_activated(device_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_activations
    WHERE upper(trim(code)) = upper(trim(device_code))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT menu_type
  FROM public.device_activations
  WHERE upper(trim(code)) = upper(trim(device_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_venue_for_device(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_device_activated(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_device_menu_type(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_venue_for_device(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_device_activated(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_menu_type(text) TO anon, authenticated;
