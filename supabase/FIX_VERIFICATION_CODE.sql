-- ============================================================
-- إعداد كامل لقاعدة البيانات — نفّذ مرة واحدة في Supabase → SQL Editor
-- يحل: relation "profiles" does not exist + كود التحقق
-- ============================================================

-- ─── 0) دالة updated_at ───
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── 1) profiles ───
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  venue_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ملفات لحسابات مسجّلة مسبقاً في Auth (أي role غير owner/staff → owner)
INSERT INTO public.profiles (id, email, full_name, venue_name, role)
SELECT
  u.id,
  u.email,
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'venue_name', '')), ''),
  CASE
    WHEN u.raw_user_meta_data ->> 'role' IN ('owner', 'staff') THEN u.raw_user_meta_data ->> 'role'
    ELSE 'owner'
  END
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, venue_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'venue_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('owner', 'staff') THEN NEW.raw_user_meta_data ->> 'role'
      ELSE 'owner'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    venue_name = COALESCE(EXCLUDED.venue_name, profiles.venue_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── 2) venues ───
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

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select_own" ON public.venues;
CREATE POLICY "venues_select_own"
  ON public.venues FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_insert_own" ON public.venues;
CREATE POLICY "venues_insert_own"
  ON public.venues FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_update_own" ON public.venues;
CREATE POLICY "venues_update_own"
  ON public.venues FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "venues_delete_own" ON public.venues;
CREATE POLICY "venues_delete_own"
  ON public.venues FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ─── 3) device_activations ───
CREATE TABLE IF NOT EXISTS public.device_activations (
  code TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  menu_type TEXT CHECK (menu_type IS NULL OR menu_type IN ('products', 'crops')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS device_activations_owner_idx ON public.device_activations (owner_id);

ALTER TABLE public.device_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_activations_select_own" ON public.device_activations;
CREATE POLICY "device_activations_select_own"
  ON public.device_activations FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_insert_own" ON public.device_activations;
CREATE POLICY "device_activations_insert_own"
  ON public.device_activations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_update_own" ON public.device_activations;
CREATE POLICY "device_activations_update_own"
  ON public.device_activations FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_delete_own" ON public.device_activations;
CREATE POLICY "device_activations_delete_own"
  ON public.device_activations FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ─── 4) device_pairing_sessions (كود التحقق) ───
CREATE TABLE IF NOT EXISTS public.device_pairing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  code TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT device_pairing_sessions_code_format CHECK (
    code IS NULL OR code ~ '^QM-[A-HJ-NP-Z2-9]{4}$'
  )
);

CREATE INDEX IF NOT EXISTS device_pairing_sessions_owner_idx
  ON public.device_pairing_sessions (owner_id, created_at DESC);

ALTER TABLE public.device_pairing_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pairing_sessions_select_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_select_own"
  ON public.device_pairing_sessions FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_insert_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_insert_own"
  ON public.device_pairing_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_delete_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_delete_own"
  ON public.device_pairing_sessions FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ─── 5) دوال الحساب والمنيو ───
DROP FUNCTION IF EXISTS public.ensure_profile(text, text);

CREATE OR REPLACE FUNCTION public.ensure_profile(
  p_full_name text DEFAULT NULL,
  p_venue_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;

  INSERT INTO public.profiles (id, email, full_name, venue_name, phone, role)
  VALUES (
    v_uid, v_email,
    NULLIF(trim(COALESCE(p_full_name, '')), ''),
    NULLIF(trim(COALESCE(p_venue_name, '')), ''),
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    'owner'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    venue_name = COALESCE(EXCLUDED.venue_name, profiles.venue_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_venue_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.venues (owner_id, data)
  VALUES (auth.uid(), '{"version":1}'::jsonb)
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$;

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
    SELECT 1 FROM public.device_activations
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
  SELECT menu_type FROM public.device_activations
  WHERE upper(trim(code)) = upper(trim(device_code))
  LIMIT 1;
$$;

-- ─── 6) دوال كود التحقق ───
CREATE OR REPLACE FUNCTION public.create_device_verification_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN RAISE EXCEPTION 'invalid_code'; END IF;
  INSERT INTO public.device_pairing_sessions (owner_id, code)
  VALUES (auth.uid(), v_code)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_device_verification_code(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.device_pairing_sessions
    WHERE upper(trim(code)) = upper(trim(p_code))
      AND expires_at > NOW()
  );
$$;

-- ─── 7) صلاحيات ───
REVOKE ALL ON FUNCTION public.ensure_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_venue_for_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_venue_for_owner() TO authenticated;

REVOKE ALL ON FUNCTION public.get_venue_for_device(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_device_activated(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_device_menu_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_for_device(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_device_activated(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_menu_type(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_device_verification_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_device_verification_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_device_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_device_verification_code(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
