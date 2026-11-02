-- Meez: all repo migrations concatenated for fresh Supabase project
-- Run in SQL Editor (or psql) on empty public schema
SET client_min_messages = warning;

-- =====================================================================
-- >>> 20260517120000_accounts_and_profiles.sql
-- =====================================================================
-- ============================================================
-- قائمة (Meez) — حسابات المستخدمين + ملفات تعريف
-- نفّذ في: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) جدول الملف الشخصي (مرتبط بـ auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  venue_name TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- 2) تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3) إنشاء profile تلقائياً عند تسجيل مستخدم جديد عبر Supabase Auth
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'owner')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    venue_name = EXCLUDED.venue_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4) Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 5) إنشاء حساب يدوياً (للتطوير فقط)
-- غيّر البريد وكلمة المرور ثم نفّذ مرة واحدة
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'owner@meez.app';
  v_password TEXT := 'MeezOwner2026!';
  v_venue TEXT := 'مقهى تجريبي';
BEGIN
  -- تجنب التكرار
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'المستخدم موجود مسبقاً: %', v_email;
    RETURN;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('venue_name', v_venue, 'full_name', 'مالك المنشأة', 'role', 'owner'),
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'تم إنشاء الحساب: % / كلمة المرور كما في السكربت', v_email;
END $$;


-- =====================================================================
-- >>> 20260519233000_venues_and_device_activations.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 20260519233010_venues_and_device_activations.sql
-- =====================================================================


-- =====================================================================
-- >>> 20260520010000_profiles_insert_policy.sql
-- =====================================================================
-- السماح للمستخدم بإنشاء ملفه الشخصي عند أول تسجيل (upsert من التطبيق)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


-- =====================================================================
-- >>> 20260520020000_ensure_profile_rpc.sql
-- =====================================================================
-- إصلاح سياسات profiles + دالة ensure_profile (تتجاوز مشاكل RLS عند التسجيل)

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- دالة آمنة: إنشاء/تحديث الملف من الجلسة الحالية
CREATE OR REPLACE FUNCTION public.ensure_profile(
  p_full_name text DEFAULT NULL,
  p_venue_name text DEFAULT NULL
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, venue_name, role)
  VALUES (
    v_uid,
    v_email,
    NULLIF(trim(COALESCE(p_full_name, '')), ''),
    NULLIF(trim(COALESCE(p_venue_name, '')), ''),
    'owner'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    venue_name = COALESCE(EXCLUDED.venue_name, profiles.venue_name),
    updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text) TO authenticated;


-- =====================================================================
-- >>> 20260520120000_device_pairing_sessions.sql
-- =====================================================================
-- جلسات ربط الآيباد: الرمز يُسجَّل من الجهاز فقط بعد فتح رابط QR

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
  ON public.device_pairing_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_insert_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_insert_own"
  ON public.device_pairing_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_delete_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_delete_own"
  ON public.device_pairing_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.create_device_pairing_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.device_pairing_sessions (owner_id)
  VALUES (auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_device_pairing_session(
  p_session_id UUID,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.device_pairing_sessions
  SET code = v_code
  WHERE id = p_session_id
    AND code IS NULL
    AND expires_at > NOW();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_device_pairing_session_code(p_session_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT code
  FROM public.device_pairing_sessions
  WHERE id = p_session_id
    AND owner_id = auth.uid()
    AND expires_at > NOW()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.create_device_pairing_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_device_pairing_session(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_pairing_session_code(UUID) TO authenticated;


-- =====================================================================
-- >>> 20260520130000_profiles_phone_and_venue_link.sql
-- =====================================================================
-- ربط الحسابات بالتفاصيل: جوال في profiles + ضمان صف venues لكل مالك

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, venue_name, phone, role)
  VALUES (
    v_uid,
    v_email,
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

REVOKE ALL ON FUNCTION public.ensure_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text, text) TO authenticated;

-- يضمن صف venues لصاحب الجلسة (يرتبط بـ profiles عبر owner_id)
CREATE OR REPLACE FUNCTION public.ensure_venue_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.venues (owner_id, data)
  VALUES (v_uid, '{"version":1}'::jsonb)
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_venue_for_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_venue_for_owner() TO authenticated;


-- =====================================================================
-- >>> 20260520140000_verification_code_flow.sql
-- =====================================================================
-- كود تحقق يُنشأ من لوحة التحكم ويُدخل على الجهاز (بدون QR)

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

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
    SELECT 1
    FROM public.device_pairing_sessions
    WHERE upper(trim(code)) = upper(trim(p_code))
      AND expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.create_device_verification_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_device_verification_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_device_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_device_verification_code(text) TO anon, authenticated;


-- =====================================================================
-- >>> 20260525120000_subscription_enforcement.sql
-- =====================================================================
-- ============================================================
-- Subscription Enforcement Layer — per-screen licensing (SaaS)
-- ============================================================

CREATE TYPE public.subscription_status AS ENUM (
  'trial',
  'active',
  'past_due',
  'grace_period',
  'suspended',
  'expired',
  'canceled'
);

CREATE TYPE public.device_license_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE public.billing_cycle AS ENUM (
  'monthly',
  'yearly'
);

-- 1) Subscriptions (one row per owner)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'trial',
  screen_count INT NOT NULL DEFAULT 1 CHECK (screen_count >= 0),
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  price_per_screen_monthly NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
  price_per_screen_yearly NUMERIC(10, 2) NOT NULL DEFAULT 450.00,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx ON public.subscriptions (current_period_end);

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2) Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_owner_created_idx
  ON public.audit_logs (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action);

-- 3) Device licensing columns
ALTER TABLE public.device_activations
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS status public.device_license_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.device_activations
SET linked_at = COALESCE(linked_at, activated_at),
    status = 'active'::public.device_license_status
WHERE linked_at IS NULL OR status IS NULL;

CREATE INDEX IF NOT EXISTS device_activations_owner_status_idx
  ON public.device_activations (owner_id, status);

CREATE INDEX IF NOT EXISTS device_activations_last_seen_idx
  ON public.device_activations (last_seen_at DESC NULLS LAST);

-- 4) RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- 5) Audit helper
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_owner_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (owner_id, action, metadata)
  VALUES (p_owner_id, p_action, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(UUID, TEXT, JSONB) FROM PUBLIC;

-- 6) Lazy subscription state transitions (server-side only)
CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_grace_days INT := 5;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Trial ended without conversion
  IF s.status = 'trial' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at < v_now THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'trial'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'expired';
  END IF;

  -- Active period ended → grace
  IF s.status = 'active'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now
     AND (s.grace_ends_at IS NULL OR s.grace_ends_at < v_now)
  THEN
    UPDATE public.subscriptions
    SET
      status = 'grace_period',
      grace_ends_at = v_now + (v_grace_days || ' days')::interval,
      updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(
      p_owner_id,
      'subscription.grace_period_started',
      jsonb_build_object('grace_days', v_grace_days)
    );
    RETURN 'grace_period';
  END IF;

  -- Grace ended → suspended (kiosk off)
  IF s.status = 'grace_period'
     AND s.grace_ends_at IS NOT NULL
     AND s.grace_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'suspended', updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.suspended', jsonb_build_object('from', 'grace_period'));
    RETURN 'suspended';
  END IF;

  -- Past due timeout → grace (if not already)
  IF s.status = 'past_due'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now - INTERVAL '3 days'
     AND (s.grace_ends_at IS NULL)
  THEN
    UPDATE public.subscriptions
    SET
      status = 'grace_period',
      grace_ends_at = v_now + (v_grace_days || ' days')::interval,
      updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('from', 'past_due'));
    RETURN 'grace_period';
  END IF;

  RETURN s.status;
END;
$$;

-- 7) Access resolution (single source of truth)
CREATE OR REPLACE FUNCTION public.resolve_subscription_access(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_status public.subscription_status;
  v_active_devices INT;
  v_kiosk BOOLEAN;
  v_edit BOOLEAN;
  v_add_devices BOOLEAN;
  v_banner TEXT;
BEGIN
  PERFORM public.refresh_subscription_state(p_owner_id);

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'kiosk_allowed', false,
      'dashboard_edit_allowed', false,
      'can_add_devices', false,
      'status', 'expired',
      'reason', 'no_subscription',
      'screen_count', 0,
      'active_device_count', 0,
      'banner', 'error'
    );
  END IF;

  v_status := s.status;

  SELECT COUNT(*)::INT INTO v_active_devices
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  v_kiosk := v_status IN ('active', 'trial', 'past_due', 'grace_period');
  v_edit := v_status IN ('active', 'trial');
  v_add_devices := v_status IN ('active', 'trial') AND v_active_devices < s.screen_count;

  v_banner := CASE v_status
    WHEN 'trial' THEN 'trial'
    WHEN 'past_due' THEN 'warning'
    WHEN 'grace_period' THEN 'grace'
    WHEN 'suspended' THEN 'suspended'
    WHEN 'expired' THEN 'expired'
    WHEN 'canceled' THEN 'canceled'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'allowed', v_status IN ('active', 'trial', 'past_due', 'grace_period'),
    'kiosk_allowed', v_kiosk,
    'dashboard_edit_allowed', v_edit,
    'can_add_devices', v_add_devices,
    'status', v_status::text,
    'reason', CASE WHEN v_kiosk THEN NULL ELSE 'subscription_' || v_status::text END,
    'screen_count', s.screen_count,
    'active_device_count', v_active_devices,
    'grace_ends_at', s.grace_ends_at,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'billing_cycle', s.billing_cycle::text,
    'banner', v_banner
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_subscription_access(UUID) TO authenticated;

-- 8) Deactivate all devices on cancel/expired
CREATE OR REPLACE FUNCTION public.deactivate_all_devices_for_owner(p_owner_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.device_activations
  SET status = 'inactive'
  WHERE owner_id = p_owner_id AND status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    PERFORM public.write_audit_log(
      p_owner_id,
      'device.deactivated_all',
      jsonb_build_object('count', v_count)
    );
  END IF;

  RETURN v_count;
END;
$$;

-- 9) Device activation with license check
CREATE OR REPLACE FUNCTION public.activate_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_access JSONB;
  v_active INT;
  v_screen_count INT;
  v_status public.subscription_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF NOT (v_access->>'can_add_devices')::boolean THEN
    IF v_status IN ('suspended', 'expired', 'canceled') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'subscription_inactive', 'access', v_access);
    END IF;
    IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
      PERFORM public.write_audit_log(v_uid, 'device.activation_denied', jsonb_build_object('code', v_code, 'reason', 'screen_limit'));
      RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_add_devices', 'access', v_access);
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_menu_type');
  END IF;

  INSERT INTO public.device_activations (code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at)
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW();

  PERFORM public.write_audit_log(
    v_uid,
    'device.added',
    jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
  );

  RETURN jsonb_build_object('ok', true, 'code', v_code, 'access', public.resolve_subscription_access(v_uid));
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) TO authenticated;

-- 10) Kiosk access check (anon + authenticated)
CREATE OR REPLACE FUNCTION public.check_kiosk_access(p_device_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_owner_id UUID;
  v_device_status public.device_license_status;
  v_access JSONB;
BEGIN
  v_code := upper(trim(p_device_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'invalid_code'
    );
  END IF;

  SELECT da.owner_id, da.status
  INTO v_owner_id, v_device_status
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = v_code
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'device_not_registered'
    );
  END IF;

  IF v_device_status <> 'active' THEN
    PERFORM public.write_audit_log(v_owner_id, 'access.denied', jsonb_build_object('code', v_code, 'reason', 'device_inactive'));
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', 'device_inactive',
      'owner_id', v_owner_id
    );
  END IF;

  v_access := public.resolve_subscription_access(v_owner_id);

  IF NOT (v_access->>'kiosk_allowed')::boolean THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object('code', v_code, 'reason', v_access->>'reason', 'status', v_access->>'status')
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', COALESCE(v_access->>'reason', 'subscription_' || (v_access->>'status')),
      'access', v_access,
      'owner_id', v_owner_id
    );
  END IF;

  -- Heartbeat on successful check
  UPDATE public.device_activations
  SET last_seen_at = NOW()
  WHERE code = v_code;

  RETURN jsonb_build_object(
    'allowed', true,
    'registered', true,
    'access', v_access,
    'owner_id', v_owner_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_kiosk_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_kiosk_access(TEXT) TO anon, authenticated;

-- 11) Device heartbeat
CREATE OR REPLACE FUNCTION public.record_device_heartbeat(p_device_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_check JSONB;
BEGIN
  v_code := upper(trim(p_device_code));
  v_check := public.check_kiosk_access(v_code);
  RETURN COALESCE((v_check->>'allowed')::boolean, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_device_heartbeat(TEXT) TO anon, authenticated;

-- 12) Guarded venue fetch for kiosk
CREATE OR REPLACE FUNCTION public.get_venue_for_device(device_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check JSONB;
  v_data JSONB;
BEGIN
  v_check := public.check_kiosk_access(device_code);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RETURN NULL;
  END IF;

  SELECT v.data INTO v_data
  FROM public.device_activations da
  JOIN public.venues v ON v.owner_id = da.owner_id
  WHERE upper(trim(da.code)) = upper(trim(device_code))
    AND da.status = 'active'
  LIMIT 1;

  RETURN v_data;
END;
$$;

-- 13) is_device_activated with subscription + license
CREATE OR REPLACE FUNCTION public.is_device_activated(device_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.check_kiosk_access(device_code)->>'allowed')::boolean, false);
$$;

-- 14) get_device_menu_type unchanged logic but only if activated
CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT da.menu_type::text
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = upper(trim(device_code))
    AND da.status = 'active'
    AND COALESCE((public.check_kiosk_access(device_code)->>'allowed')::boolean, false)
  LIMIT 1;
$$;

-- 15) Owner subscription fetch
CREATE OR REPLACE FUNCTION public.get_owner_subscription()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  s public.subscriptions%ROWTYPE;
  v_access JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('access', v_access);
  END IF;

  RETURN jsonb_build_object(
    'owner_id', s.owner_id,
    'status', s.status::text,
    'screen_count', s.screen_count,
    'billing_cycle', s.billing_cycle::text,
    'price_per_screen_monthly', s.price_per_screen_monthly,
    'price_per_screen_yearly', s.price_per_screen_yearly,
    'trial_ends_at', s.trial_ends_at,
    'current_period_start', s.current_period_start,
    'current_period_end', s.current_period_end,
    'grace_ends_at', s.grace_ends_at,
    'canceled_at', s.canceled_at,
    'access', v_access
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_subscription() TO authenticated;

-- 16) Billing webhook processor (service role / server only)
CREATE OR REPLACE FUNCTION public.process_billing_webhook(
  p_owner_id UUID,
  p_event TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_screens INT;
  v_cycle public.billing_cycle;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_owner_id');
  END IF;

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (owner_id, status, screen_count, trial_ends_at)
    VALUES (p_owner_id, 'trial', 1, v_now + INTERVAL '14 days')
    RETURNING * INTO s;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.created', p_payload);
  END IF;

  v_screens := COALESCE((p_payload->>'screen_count')::int, s.screen_count);
  v_cycle := COALESCE((p_payload->>'billing_cycle')::public.billing_cycle, s.billing_cycle);

  IF p_event IN ('payment.success', 'subscription.updated', 'subscription.renewed') THEN
    UPDATE public.subscriptions
    SET
      status = 'active',
      screen_count = GREATEST(1, v_screens),
      billing_cycle = v_cycle,
      current_period_start = v_now,
      current_period_end = CASE v_cycle
        WHEN 'yearly' THEN v_now + INTERVAL '1 year'
        ELSE v_now + INTERVAL '1 month'
      END,
      grace_ends_at = NULL,
      canceled_at = NULL,
      updated_at = v_now,
      metadata = s.metadata || COALESCE(p_payload, '{}'::jsonb)
    WHERE owner_id = p_owner_id;

    PERFORM public.write_audit_log(p_owner_id, 'payment.success', p_payload);

    RETURN jsonb_build_object(
      'ok', true,
      'access', public.resolve_subscription_access(p_owner_id)
    );
  END IF;

  IF p_event IN ('payment.failed', 'invoice.payment_failed') THEN
    UPDATE public.subscriptions
    SET status = 'past_due', updated_at = v_now
    WHERE owner_id = p_owner_id;

    PERFORM public.write_audit_log(p_owner_id, 'payment.failed', p_payload);

    RETURN jsonb_build_object(
      'ok', true,
      'access', public.resolve_subscription_access(p_owner_id)
    );
  END IF;

  IF p_event IN ('subscription.canceled', 'subscription.cancelled') THEN
    UPDATE public.subscriptions
    SET status = 'canceled', canceled_at = v_now, updated_at = v_now
    WHERE owner_id = p_owner_id;

    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    PERFORM public.write_audit_log(p_owner_id, 'subscription.canceled', p_payload);

    RETURN jsonb_build_object('ok', true, 'access', public.resolve_subscription_access(p_owner_id));
  END IF;

  IF p_event = 'subscription.expired' THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id;

    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', p_payload);

    RETURN jsonb_build_object('ok', true, 'access', public.resolve_subscription_access(p_owner_id));
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'unknown_event');
END;
$$;

REVOKE ALL ON FUNCTION public.process_billing_webhook(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_billing_webhook(UUID, TEXT, JSONB) TO service_role;

-- 17) Create subscription on new profile
CREATE OR REPLACE FUNCTION public.ensure_subscription_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.subscriptions (owner_id, status, screen_count, trial_ends_at, current_period_start, current_period_end)
  VALUES (
    v_uid,
    'trial',
    1,
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_subscription_for_owner() TO authenticated;

-- Auto-create subscription when profile is created (via trigger on profiles)
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (owner_id, status, screen_count, trial_ends_at, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    'trial',
    1,
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_subscription ON public.profiles;
CREATE TRIGGER on_profile_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_subscription();

-- Backfill subscriptions for existing owners
INSERT INTO public.subscriptions (owner_id, status, screen_count, trial_ends_at, current_period_start, current_period_end)
SELECT
  p.id,
  'trial',
  GREATEST(1, (
    SELECT COUNT(*)::int
    FROM public.device_activations da
    WHERE da.owner_id = p.id AND da.status = 'active'
  )),
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW() + INTERVAL '14 days'
FROM public.profiles p
ON CONFLICT (owner_id) DO NOTHING;


-- =====================================================================
-- >>> 20260525130000_trial_single_screen.sql
-- =====================================================================
-- الفترة التجريبية: شاشة واحدة فقط (تطبيق على مستوى resolve)

CREATE OR REPLACE FUNCTION public.effective_screen_count(
  p_status public.subscription_status,
  p_screen_count INT
)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'trial' THEN 1
    ELSE GREATEST(0, p_screen_count)
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_subscription_access(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_status public.subscription_status;
  v_active_devices INT;
  v_effective_screens INT;
  v_kiosk BOOLEAN;
  v_edit BOOLEAN;
  v_add_devices BOOLEAN;
  v_banner TEXT;
BEGIN
  PERFORM public.refresh_subscription_state(p_owner_id);

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'kiosk_allowed', false,
      'dashboard_edit_allowed', false,
      'can_add_devices', false,
      'status', 'expired',
      'reason', 'no_subscription',
      'screen_count', 0,
      'licensed_screen_count', 0,
      'active_device_count', 0,
      'banner', 'error'
    );
  END IF;

  v_status := s.status;
  v_effective_screens := public.effective_screen_count(v_status, s.screen_count);

  -- تصحيح سجل trial إذا كان screen_count > 1
  IF v_status = 'trial' AND s.screen_count <> 1 THEN
    UPDATE public.subscriptions
    SET screen_count = 1, updated_at = NOW()
    WHERE owner_id = p_owner_id;
    s.screen_count := 1;
    v_effective_screens := 1;
  END IF;

  SELECT COUNT(*)::INT INTO v_active_devices
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  v_kiosk := v_status IN ('active', 'trial', 'past_due', 'grace_period');
  v_edit := v_status IN ('active', 'trial');
  v_add_devices := v_status IN ('active', 'trial') AND v_active_devices < v_effective_screens;

  v_banner := CASE v_status
    WHEN 'past_due' THEN 'warning'
    WHEN 'grace_period' THEN 'grace'
    WHEN 'suspended' THEN 'suspended'
    WHEN 'expired' THEN 'expired'
    WHEN 'canceled' THEN 'canceled'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'allowed', v_status IN ('active', 'trial', 'past_due', 'grace_period'),
    'kiosk_allowed', v_kiosk,
    'dashboard_edit_allowed', v_edit,
    'can_add_devices', v_add_devices,
    'status', v_status::text,
    'reason', CASE WHEN v_kiosk THEN NULL ELSE 'subscription_' || v_status::text END,
    'screen_count', v_effective_screens,
    'licensed_screen_count', s.screen_count,
    'active_device_count', v_active_devices,
    'grace_ends_at', s.grace_ends_at,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'billing_cycle', s.billing_cycle::text,
    'banner', v_banner
  );
END;
$$;

-- تأكيد trial = شاشة واحدة عند الإنشاء
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    owner_id, status, screen_count, trial_ends_at, current_period_start, current_period_end
  )
  VALUES (
    NEW.id,
    'trial',
    1,
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE public.subscriptions
SET screen_count = 1, updated_at = NOW()
WHERE status = 'trial' AND screen_count <> 1;


-- =====================================================================
-- >>> 20260525140000_subscription_client_confirm.sql
-- =====================================================================
-- تأكيد الدفع من الواجهة (بدون خادم Express) — للمستخدم المسجّل فقط

CREATE OR REPLACE FUNCTION public.confirm_subscription_payment(
  p_screen_count INT,
  p_billing_cycle TEXT,
  p_card_last4 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cycle public.billing_cycle;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_screen_count IS NULL OR p_screen_count < 1 OR p_screen_count > 50 THEN
    RAISE EXCEPTION 'invalid_screen_count';
  END IF;

  v_cycle := CASE lower(trim(p_billing_cycle))
    WHEN 'yearly' THEN 'yearly'::public.billing_cycle
    ELSE 'monthly'::public.billing_cycle
  END;

  RETURN public.process_billing_webhook(
    v_uid,
    'payment.success',
    jsonb_build_object(
      'screen_count', p_screen_count,
      'billing_cycle', v_cycle::text,
      'card_last4', NULLIF(trim(p_card_last4), ''),
      'client_confirm', true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_subscription_payment(INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_subscription_payment(INT, TEXT, TEXT) TO authenticated;


-- =====================================================================
-- >>> 20260525150000_core_platform_security.sql
-- =====================================================================
-- ============================================================
-- Core Platform Security Layer
-- Multi-tenant isolation, device licensing, RPC-only writes
-- ============================================================

-- 1) Device model hardening
ALTER TABLE public.device_activations
  ADD COLUMN IF NOT EXISTS device_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS device_activations_device_id_idx
  ON public.device_activations (device_id);

-- Extend device status for suspended licenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'device_license_status' AND e.enumlabel = 'suspended'
  ) THEN
    ALTER TYPE public.device_license_status ADD VALUE IF NOT EXISTS 'suspended';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Block direct table writes from API clients (RLS + privileges)
DROP POLICY IF EXISTS "device_activations_insert_own" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_update_own" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_delete_own" ON public.device_activations;

DROP POLICY IF EXISTS "venues_insert_own" ON public.venues;
DROP POLICY IF EXISTS "venues_update_own" ON public.venues;
DROP POLICY IF EXISTS "venues_delete_own" ON public.venues;

REVOKE INSERT, UPDATE, DELETE ON public.device_activations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.venues FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

-- SELECT remains via RLS (owner isolation)
DROP POLICY IF EXISTS "venues_select_own" ON public.venues;
CREATE POLICY "venues_select_own"
  ON public.venues FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "device_activations_select_own" ON public.device_activations;
CREATE POLICY "device_activations_select_own"
  ON public.device_activations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- 3) Enforce screen limits — deactivate oldest active devices when over quota
CREATE OR REPLACE FUNCTION public.enforce_owner_device_limits(p_owner_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access JSONB;
  v_allowed INT;
  v_active INT;
  v_deactivated INT := 0;
  r RECORD;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN 0;
  END IF;

  v_access := public.resolve_subscription_access(p_owner_id);
  v_allowed := GREATEST(0, COALESCE((v_access->>'screen_count')::int, 0));
  v_active := COALESCE((v_access->>'active_device_count')::int, 0);

  IF v_active <= v_allowed THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT code
    FROM public.device_activations
    WHERE owner_id = p_owner_id AND status = 'active'
    ORDER BY COALESCE(last_seen_at, activated_at) ASC NULLS FIRST, activated_at ASC
    LIMIT (v_active - v_allowed)
  LOOP
    UPDATE public.device_activations
    SET status = 'inactive'
    WHERE code = r.code;

    v_deactivated := v_deactivated + 1;

    PERFORM public.write_audit_log(
      p_owner_id,
      'device.auto_deactivated',
      jsonb_build_object('code', r.code, 'reason', 'screen_limit_exceeded')
    );
  END LOOP;

  RETURN v_deactivated;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_owner_device_limits(UUID) FROM PUBLIC;

-- 4) Hardened device registration (single authority)
CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.register_denied',
      jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
    );
    RETURN jsonb_build_object('ok', false, 'error', 'code_already_claimed');
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF v_existing_owner IS NULL THEN
    IF NOT (v_access->>'can_add_devices')::boolean THEN
      IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        PERFORM public.write_audit_log(v_uid, 'device.register_denied', jsonb_build_object('code', v_code, 'reason', 'screen_limit'));
        RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
      END IF;
      RETURN jsonb_build_object('ok', false, 'error', 'cannot_add_devices', 'access', v_access);
    END IF;
  ELSIF v_existing_status <> 'active' THEN
    IF NOT (v_access->>'can_add_devices')::boolean
       AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
      RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_menu_type');
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  PERFORM public.enforce_owner_device_limits(v_uid);

  PERFORM public.write_audit_log(
    v_uid,
    'device.registered',
    jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', public.resolve_subscription_access(v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT) TO authenticated;

-- Backward-compatible alias
CREATE OR REPLACE FUNCTION public.activate_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.register_device_with_license(p_code, p_menu_type, p_device_name);
$$;

GRANT EXECUTE ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) TO authenticated;

-- 5) Deactivate device (never delete — code cannot be reused by another owner)
CREATE OR REPLACE FUNCTION public.deactivate_device(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_updated INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  UPDATE public.device_activations
  SET status = 'inactive', last_seen_at = NOW()
  WHERE code = v_code AND owner_id = v_uid AND status = 'active';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_already_inactive');
  END IF;

  PERFORM public.write_audit_log(v_uid, 'device.deactivated', jsonb_build_object('code', v_code));

  RETURN jsonb_build_object('ok', true, 'access', public.resolve_subscription_access(v_uid));
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_device(TEXT) TO authenticated;

-- 6) Venue writes — RPC only with subscription gate
CREATE OR REPLACE FUNCTION public.update_venue_data(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_exists BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_data');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.venues WHERE owner_id = v_uid) INTO v_exists;

  IF v_exists THEN
    v_access := public.resolve_subscription_access(v_uid);
    IF NOT COALESCE((v_access->>'dashboard_edit_allowed')::boolean, false) THEN
      PERFORM public.write_audit_log(
        v_uid,
        'venue.update_denied',
        jsonb_build_object('reason', v_access->>'reason', 'status', v_access->>'status')
      );
      RETURN jsonb_build_object('ok', false, 'error', 'subscription_edit_blocked', 'access', v_access);
    END IF;

    UPDATE public.venues
    SET data = p_data, updated_at = NOW()
    WHERE owner_id = v_uid;
  ELSE
    INSERT INTO public.venues (owner_id, data)
    VALUES (v_uid, p_data);
  END IF;

  PERFORM public.write_audit_log(v_uid, 'venue.updated', jsonb_build_object('bytes', octet_length(p_data::text)));

  RETURN jsonb_build_object('ok', true, 'updated_at', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_venue_data(JSONB) TO authenticated;

-- 7) Dashboard preview — authenticated owner only, no kiosk bypass
CREATE OR REPLACE FUNCTION public.get_dashboard_preview_venue()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_access := public.resolve_subscription_access(v_uid);

  IF NOT COALESCE((v_access->>'dashboard_edit_allowed')::boolean, false)
     AND NOT COALESCE((v_access->>'kiosk_allowed')::boolean, false) THEN
    PERFORM public.write_audit_log(
      v_uid,
      'preview.denied',
      jsonb_build_object('status', v_access->>'status')
    );
    RETURN NULL;
  END IF;

  SELECT v.data INTO v_data FROM public.venues v WHERE v.owner_id = v_uid LIMIT 1;

  PERFORM public.write_audit_log(v_uid, 'preview.menu_access', jsonb_build_object('has_data', v_data IS NOT NULL));

  RETURN v_data;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_preview_venue() TO authenticated;

-- 8) Client audit log (whitelist actions only)
CREATE OR REPLACE FUNCTION public.write_client_audit_log(
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_action NOT IN (
    'auth.login',
    'auth.logout',
    'device.register_attempt',
    'menu.preview_open',
    'subscription.view',
    'dashboard.navigation'
  ) THEN
    RAISE EXCEPTION 'invalid_audit_action';
  END IF;

  RETURN public.write_audit_log(v_uid, p_action, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.write_client_audit_log(TEXT, JSONB) TO authenticated;

-- 9) List owner devices (read path for dashboard sync)
CREATE OR REPLACE FUNCTION public.list_owner_devices()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.enforce_owner_device_limits(v_uid);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'device_id', da.device_id,
          'code', da.code,
          'menu_type', da.menu_type,
          'status', da.status::text,
          'device_name', da.device_name,
          'last_seen_at', da.last_seen_at,
          'activated_at', da.activated_at,
          'created_at', da.created_at
        )
        ORDER BY da.activated_at DESC
      )
      FROM public.device_activations da
      WHERE da.owner_id = v_uid
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_owner_devices() TO authenticated;

-- 10) Refresh subscription: deactivate devices on suspended
CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_grace_days INT := 5;
  v_result public.subscription_status;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF s.status = 'trial' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at < v_now THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = v_now WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'trial'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'expired';
  END IF;

  IF s.status = 'active'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now
     AND (s.grace_ends_at IS NULL OR s.grace_ends_at < v_now)
  THEN
    UPDATE public.subscriptions
    SET status = 'grace_period', grace_ends_at = v_now + (v_grace_days || ' days')::interval, updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('grace_days', v_grace_days));
    RETURN 'grace_period';
  END IF;

  IF s.status = 'grace_period' AND s.grace_ends_at IS NOT NULL AND s.grace_ends_at < v_now THEN
    UPDATE public.subscriptions SET status = 'suspended', updated_at = v_now WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.suspended', jsonb_build_object('from', 'grace_period'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'suspended';
  END IF;

  IF s.status = 'past_due'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now - INTERVAL '3 days'
     AND s.grace_ends_at IS NULL
  THEN
    UPDATE public.subscriptions
    SET status = 'grace_period', grace_ends_at = v_now + (v_grace_days || ' days')::interval, updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('from', 'past_due'));
    RETURN 'grace_period';
  END IF;

  v_result := s.status;
  PERFORM public.enforce_owner_device_limits(p_owner_id);
  RETURN v_result;
END;
$$;

-- 11) resolve_subscription_access — enforce limits on every check
CREATE OR REPLACE FUNCTION public.resolve_subscription_access(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_status public.subscription_status;
  v_active_devices INT;
  v_kiosk BOOLEAN;
  v_edit BOOLEAN;
  v_add_devices BOOLEAN;
  v_banner TEXT;
  v_screen_count INT;
BEGIN
  PERFORM public.refresh_subscription_state(p_owner_id);

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'kiosk_allowed', false,
      'dashboard_edit_allowed', false,
      'can_add_devices', false,
      'status', 'expired',
      'reason', 'no_subscription',
      'screen_count', 0,
      'active_device_count', 0,
      'banner', 'error'
    );
  END IF;

  v_status := s.status;
  v_screen_count := public.effective_screen_count(s.status, s.screen_count);

  PERFORM public.enforce_owner_device_limits(p_owner_id);

  SELECT COUNT(*)::INT INTO v_active_devices
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  v_kiosk := v_status IN ('active', 'trial', 'past_due', 'grace_period');
  v_edit := v_status IN ('active', 'trial');
  v_add_devices := v_status IN ('active', 'trial') AND v_active_devices < v_screen_count;

  v_banner := CASE v_status
    WHEN 'trial' THEN 'trial'
    WHEN 'past_due' THEN 'warning'
    WHEN 'grace_period' THEN 'grace'
    WHEN 'suspended' THEN 'suspended'
    WHEN 'expired' THEN 'expired'
    WHEN 'canceled' THEN 'canceled'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'allowed', v_status IN ('active', 'trial', 'past_due', 'grace_period'),
    'kiosk_allowed', v_kiosk,
    'dashboard_edit_allowed', v_edit,
    'can_add_devices', v_add_devices,
    'status', v_status::text,
    'reason', CASE WHEN v_kiosk THEN NULL ELSE 'subscription_' || v_status::text END,
    'screen_count', v_screen_count,
    'active_device_count', v_active_devices,
    'grace_ends_at', s.grace_ends_at,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'billing_cycle', s.billing_cycle::text,
    'banner', v_banner
  );
END;
$$;

-- 12) Optimize get_device_menu_type (single kiosk check)
CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check JSONB;
  v_menu_type TEXT;
BEGIN
  v_check := public.check_kiosk_access(device_code);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RETURN NULL;
  END IF;

  SELECT da.menu_type::text INTO v_menu_type
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = upper(trim(device_code))
    AND da.status = 'active'
  LIMIT 1;

  RETURN v_menu_type;
END;
$$;

-- 13) Close payment bypass from client (service_role / Express webhook only)
REVOKE EXECUTE ON FUNCTION public.confirm_subscription_payment(INT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_subscription_payment(INT, TEXT, TEXT) FROM anon;


-- =====================================================================
-- >>> 20260525160000_verification_code_login.sql
-- =====================================================================
-- ============================================================
-- كود التحقق — ربط الدخول للحساب + تفعيل الأجهزة
-- ============================================================

-- تحقق عند تسجيل الدخول (قبل المصادقة): الكود + البريد يطابقان جلسة صالحة
CREATE OR REPLACE FUNCTION public.verify_login_verification_code(
  p_code TEXT,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_pairing_sessions dps
    JOIN public.profiles p ON p.id = dps.owner_id
    WHERE upper(trim(dps.code)) = upper(trim(p_code))
      AND lower(trim(p.email)) = lower(trim(p_email))
      AND dps.expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.verify_login_verification_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login_verification_code(TEXT, TEXT) TO anon, authenticated;

-- تحقق للمالك المسجّل: الكود صادر من لوحة التحكم لنفس الحساب
CREATE OR REPLACE FUNCTION public.verify_owner_verification_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_pairing_sessions dps
    WHERE dps.owner_id = auth.uid()
      AND upper(trim(dps.code)) = upper(trim(p_code))
      AND dps.expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.verify_owner_verification_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_owner_verification_code(TEXT) TO authenticated;

-- استهلاك الكود بعد تسجيل الدخول أو تفعيل الجهاز
CREATE OR REPLACE FUNCTION public.consume_verification_code(p_code TEXT, p_owner_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := COALESCE(p_owner_id, auth.uid());
BEGIN
  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.device_pairing_sessions
  WHERE owner_id = v_owner
    AND upper(trim(code)) = upper(trim(p_code));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_verification_code(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_verification_code(TEXT, UUID) TO authenticated;

-- تحديث تسجيل الجهاز: يتطلب كود تحقق صالح للأجهزة الجديدة
CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.register_denied',
      jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
    );
    RETURN jsonb_build_object('ok', false, 'error', 'code_already_claimed');
  END IF;

  -- جهاز جديد: يجب كود تحقق من لوحة التحكم
  IF v_existing_owner IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND dps.code = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object('ok', false, 'error', 'verification_code_invalid');
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF v_existing_owner IS NULL THEN
    IF NOT (v_access->>'can_add_devices')::boolean THEN
      IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        PERFORM public.write_audit_log(v_uid, 'device.register_denied', jsonb_build_object('code', v_code, 'reason', 'screen_limit'));
        RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
      END IF;
      RETURN jsonb_build_object('ok', false, 'error', 'cannot_add_devices', 'access', v_access);
    END IF;
  ELSIF v_existing_status <> 'active' THEN
    IF NOT (v_access->>'can_add_devices')::boolean
       AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
      RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_menu_type');
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  PERFORM public.consume_verification_code(v_code, v_uid);
  PERFORM public.enforce_owner_device_limits(v_uid);

  PERFORM public.write_audit_log(
    v_uid,
    'device.registered',
    jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', public.resolve_subscription_access(v_uid)
  );
END;
$$;


-- =====================================================================
-- >>> 20260525184435_core_platform_security.sql
-- =====================================================================


-- =====================================================================
-- >>> 20260525200000_venue_sync_lightweight.sql
-- =====================================================================
-- فحص خفيف لتاريخ تحديث المنيو (لتقليل egress على أجهزة العرض)
CREATE OR REPLACE FUNCTION public.get_venue_updated_at_for_device(device_code text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.updated_at
  FROM public.device_activations da
  JOIN public.venues v ON v.owner_id = da.owner_id
  WHERE upper(trim(da.code)) = upper(trim(device_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_venue_updated_at_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_updated_at_for_device(text) TO anon, authenticated;


-- =====================================================================
-- >>> 20260525210000_dashboard_preview_always.sql
-- =====================================================================
-- معاينة المنيو من لوحة التحكم: للمالك المسجّل دخوله دائماً (بغضّ النظر عن حالة الاشتراك)
CREATE OR REPLACE FUNCTION public.get_dashboard_preview_venue()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.data INTO v_data FROM public.venues v WHERE v.owner_id = v_uid LIMIT 1;

  PERFORM public.write_audit_log(
    v_uid,
    'preview.menu_access',
    jsonb_build_object('has_data', v_data IS NOT NULL)
  );

  RETURN v_data;
END;
$$;


-- =====================================================================
-- >>> 20260531120000_fix_verification_session_match.sql
-- =====================================================================
-- توحيد مقارنة كود التحقق (upper/trim) في register_device_with_license
-- verify_owner_verification_code يستخدم upper(trim) بينما register كان يطابق حرفياً

CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.register_denied',
      jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
    );
    RETURN jsonb_build_object('ok', false, 'error', 'code_already_claimed');
  END IF;

  IF v_existing_owner IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND upper(trim(dps.code)) = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object('ok', false, 'error', 'verification_code_invalid');
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF v_existing_owner IS NULL THEN
    IF NOT (v_access->>'can_add_devices')::boolean THEN
      IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        PERFORM public.write_audit_log(v_uid, 'device.register_denied', jsonb_build_object('code', v_code, 'reason', 'screen_limit'));
        RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
      END IF;
      RETURN jsonb_build_object('ok', false, 'error', 'cannot_add_devices', 'access', v_access);
    END IF;
  ELSIF v_existing_status <> 'active' THEN
    IF NOT (v_access->>'can_add_devices')::boolean
       AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
      RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_menu_type');
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  PERFORM public.consume_verification_code(v_code, v_uid);
  PERFORM public.enforce_owner_device_limits(v_uid);

  PERFORM public.write_audit_log(
    v_uid,
    'device.registered',
    jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', public.resolve_subscription_access(v_uid)
  );
END;
$$;


-- =====================================================================
-- >>> 20260531130000_dev_environment_device_license.sql
-- =====================================================================
-- ============================================================
-- بيئة التطوير vs الإنتاج لتفعيل الأجهزة
-- يُقرأ app.environment عبر current_setting('app.environment', true)
-- التطوير المحلي: ALTER ROLE authenticator SET app.environment TO 'development';
-- الإنتاج: اترك غير مضبوط أو = 'production'
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_environment()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      nullif(trim(current_setting('app.environment', true)), ''),
      'production'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.app_is_development()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.app_environment() IN ('development', 'dev', 'local');
$$;

CREATE OR REPLACE FUNCTION public.resolve_dev_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.app_environment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_development() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_dev_owner_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_environment() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.app_is_development() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_dev_owner_id() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev BOOLEAN := public.app_is_development();
  v_uid UUID;
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
BEGIN
  IF v_dev THEN
    v_uid := public.resolve_dev_owner_id();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'dev_mode', true,
        'error', 'no_dev_owner'
      );
    END IF;
  ELSE
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'not_authenticated'
      );
    END IF;
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_code'
    );
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    IF NOT v_dev THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'code_already_claimed'
    );
  END IF;

  IF v_existing_owner IS NULL AND NOT v_dev THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND upper(trim(dps.code)) = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'verification_code_invalid'
      );
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF NOT v_dev THEN
    IF v_existing_owner IS NULL THEN
      IF NOT (v_access->>'can_add_devices')::boolean THEN
        IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
          PERFORM public.write_audit_log(
            v_uid,
            'device.register_denied',
            jsonb_build_object('code', v_code, 'reason', 'screen_limit')
          );
          RETURN jsonb_build_object(
            'ok', false,
            'success', false,
            'error', 'screen_limit_exceeded',
            'access', v_access
          );
        END IF;
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'cannot_add_devices',
          'access', v_access
        );
      END IF;
    ELSIF v_existing_status <> 'active' THEN
      IF NOT (v_access->>'can_add_devices')::boolean
         AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'screen_limit_exceeded',
          'access', v_access
        );
      END IF;
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_menu_type'
    );
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  IF NOT v_dev THEN
    PERFORM public.consume_verification_code(v_code, v_uid);
  END IF;
  PERFORM public.enforce_owner_device_limits(v_uid);

  IF NOT v_dev THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.registered',
      jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
    );
  END IF;

  v_access := public.resolve_subscription_access(v_uid);

  IF v_dev THEN
    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'dev_mode', true,
      'code', v_code,
      'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
      'access', v_access
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', v_access
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.register_device_with_license(p_code, p_menu_type, p_device_name);
END;
$$;

REVOKE ALL ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) TO authenticated, anon;


-- =====================================================================
-- >>> 20260531140000_activate_device_license_app_env.sql
-- =====================================================================
-- activate_device_with_license(license, device, app_env)
-- register_device_with_license(..., p_app_env) — البيئة من المعامل بدل الاعتماد على current_setting فقط

CREATE OR REPLACE FUNCTION public.resolve_app_is_development(p_app_env TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      nullif(trim(p_app_env), ''),
      nullif(trim(current_setting('app.environment', true)), ''),
      'production'
    )
  ) IN ('development', 'dev', 'local');
$$;

CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL,
  p_app_env TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev BOOLEAN := public.resolve_app_is_development(p_app_env);
  v_uid UUID;
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
BEGIN
  IF v_dev THEN
    v_uid := public.resolve_dev_owner_id();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'dev_mode', true,
        'error', 'no_dev_owner'
      );
    END IF;
  ELSE
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'not_authenticated'
      );
    END IF;
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_code'
    );
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    IF NOT v_dev THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'code_already_claimed'
    );
  END IF;

  IF v_existing_owner IS NULL AND NOT v_dev THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND upper(trim(dps.code)) = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'verification_code_invalid'
      );
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF NOT v_dev THEN
    IF v_existing_owner IS NULL THEN
      IF NOT (v_access->>'can_add_devices')::boolean THEN
        IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
          PERFORM public.write_audit_log(
            v_uid,
            'device.register_denied',
            jsonb_build_object('code', v_code, 'reason', 'screen_limit')
          );
          RETURN jsonb_build_object(
            'ok', false,
            'success', false,
            'error', 'screen_limit_exceeded',
            'access', v_access
          );
        END IF;
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'cannot_add_devices',
          'access', v_access
        );
      END IF;
    ELSIF v_existing_status <> 'active' THEN
      IF NOT (v_access->>'can_add_devices')::boolean
         AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'screen_limit_exceeded',
          'access', v_access
        );
      END IF;
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_menu_type'
    );
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  IF NOT v_dev THEN
    PERFORM public.consume_verification_code(v_code, v_uid);
  END IF;
  PERFORM public.enforce_owner_device_limits(v_uid);

  IF NOT v_dev THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.registered',
      jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
    );
  END IF;

  v_access := public.resolve_subscription_access(v_uid);

  IF v_dev THEN
    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'dev_mode', true,
      'code', v_code,
      'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
      'access', v_access
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', v_access
  );
END;
$$;

DROP FUNCTION IF EXISTS public.activate_device_with_license(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.activate_device_with_license(
  license TEXT,
  device TEXT,
  app_env TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.register_device_with_license(
    license,
    NULL,
    device,
    app_env
  );
END;
$$;

DROP FUNCTION IF EXISTS public.register_device_with_license(TEXT, TEXT, TEXT);

REVOKE ALL ON FUNCTION public.resolve_app_is_development(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_app_is_development(TEXT) TO authenticated, anon, service_role;

REVOKE ALL ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) TO authenticated, anon;


-- =====================================================================
-- >>> 20260531150000_fix_subscription_access_recursion.sql
-- =====================================================================
-- إصلاح stack depth limit exceeded: enforce_owner_device_limits ↔ resolve_subscription_access

CREATE OR REPLACE FUNCTION public.enforce_owner_device_limits(p_owner_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_allowed INT;
  v_active INT;
  v_deactivated INT := 0;
  r RECORD;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_allowed := GREATEST(0, COALESCE(public.effective_screen_count(s.status, s.screen_count), 0));

  SELECT COUNT(*)::INT INTO v_active
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  IF v_active <= v_allowed THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT code
    FROM public.device_activations
    WHERE owner_id = p_owner_id AND status = 'active'
    ORDER BY COALESCE(last_seen_at, activated_at) ASC NULLS FIRST, activated_at ASC
    LIMIT (v_active - v_allowed)
  LOOP
    UPDATE public.device_activations
    SET status = 'inactive'
    WHERE code = r.code;

    v_deactivated := v_deactivated + 1;

    PERFORM public.write_audit_log(
      p_owner_id,
      'device.auto_deactivated',
      jsonb_build_object('code', r.code, 'reason', 'screen_limit_exceeded')
    );
  END LOOP;

  RETURN v_deactivated;
END;
$$;

-- قطع الحلقة: refresh_subscription_state لا يستدعي enforce (يُستدعى من resolve_subscription_access)
CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_grace_days INT := 5;
  v_result public.subscription_status;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF s.status = 'trial' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at < v_now THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = v_now WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'trial'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'expired';
  END IF;

  IF s.status = 'active'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now
     AND (s.grace_ends_at IS NULL OR s.grace_ends_at < v_now)
  THEN
    UPDATE public.subscriptions
    SET status = 'grace_period', grace_ends_at = v_now + (v_grace_days || ' days')::interval, updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('grace_days', v_grace_days));
    RETURN 'grace_period';
  END IF;

  IF s.status = 'grace_period' AND s.grace_ends_at IS NOT NULL AND s.grace_ends_at < v_now THEN
    UPDATE public.subscriptions SET status = 'suspended', updated_at = v_now WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.suspended', jsonb_build_object('from', 'grace_period'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'suspended';
  END IF;

  IF s.status = 'past_due'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now - INTERVAL '3 days'
     AND s.grace_ends_at IS NULL
  THEN
    UPDATE public.subscriptions
    SET status = 'grace_period', grace_ends_at = v_now + (v_grace_days || ' days')::interval, updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('from', 'past_due'));
    RETURN 'grace_period';
  END IF;

  v_result := s.status;
  RETURN v_result;
END;
$$;


-- =====================================================================
-- >>> 20260531160000_list_active_devices_only.sql
-- =====================================================================
-- Dashboard: list only active devices; bulk deactivate for owner

CREATE OR REPLACE FUNCTION public.list_owner_devices()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.enforce_owner_device_limits(v_uid);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'device_id', da.device_id,
          'code', da.code,
          'menu_type', da.menu_type,
          'status', da.status::text,
          'device_name', da.device_name,
          'last_seen_at', da.last_seen_at,
          'activated_at', da.activated_at,
          'created_at', da.created_at
        )
        ORDER BY da.activated_at DESC NULLS LAST
      )
      FROM public.device_activations da
      WHERE da.owner_id = v_uid
        AND da.status = 'active'
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_all_my_devices()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_count := public.deactivate_all_devices_for_owner(v_uid);

  RETURN jsonb_build_object(
    'ok', true,
    'count', v_count,
    'access', public.resolve_subscription_access(v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_all_my_devices() TO authenticated;


-- =====================================================================
-- >>> 20260531170000_enable_realtime_kiosk.sql
-- =====================================================================
-- Realtime للكشk: device_activations + venues

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'device_activations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_activations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'venues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
  END IF;
END $$;

-- الكشk (anon) يحتاج SELECT لاستقبال postgres_changes
DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
CREATE POLICY "device_activations_select_anon_kiosk"
  ON public.device_activations FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "venues_select_anon_kiosk" ON public.venues;
CREATE POLICY "venues_select_anon_kiosk"
  ON public.venues FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.device_activations da
      WHERE da.owner_id = venues.owner_id
        AND da.status = 'active'
    )
  );


-- =====================================================================
-- >>> 20260612120000_device_code_index_perf.sql
-- =====================================================================
-- فهرس code على device_activations لتسريع check_kiosk_access
CREATE UNIQUE INDEX IF NOT EXISTS device_activations_code_idx
  ON public.device_activations (code);

-- فهرس owner_id على venues (إن لم يكن PK/unique كافياً للـ JOIN)
CREATE INDEX IF NOT EXISTS venues_owner_id_idx
  ON public.venues (owner_id);


-- =====================================================================
-- >>> 20260613120000_security_critical_rpc_rls.sql
-- =====================================================================
-- ============================================================
-- Security: Critical fixes C1–C4 (production-safe)
-- C1) Lock sensitive RPCs to service_role only
-- C2) Remove / tighten anon RLS on device_activations & venues
-- C3) Backfill missing profiles for auth.users
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- C1 — Sensitive RPCs: service_role ONLY
-- Internal SECURITY DEFINER calls (e.g. check_kiosk_access →
-- resolve_subscription_access) remain valid via function owner.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'process_billing_webhook',
        'deactivate_all_devices_for_owner',
        'refresh_subscription_state',
        'write_audit_log',
        'resolve_subscription_access'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- C2 — RLS: remove permissive anon access to venues (menu JSONB)
-- Kiosk reads venue data via get_venue_for_device (RPC + gate).
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "venues_select_anon_kiosk" ON public.venues;
DROP POLICY IF EXISTS "venues_anon_kiosk_select" ON public.venues;

-- Belt-and-suspenders: no direct table SELECT for anon on venues
REVOKE SELECT ON TABLE public.venues FROM anon;

-- ────────────────────────────────────────────────────────────
-- C2 — RLS: replace device_activations anon USING (true)
-- Keeps Realtime postgres_changes for kiosk (code filter in client).
-- Blocks REST full-table scrape; anon still needs row-level SELECT
-- for subscribed device code only (Realtime filter + RLS).
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_anon_kiosk_select" ON public.device_activations;

CREATE POLICY "device_activations_select_anon_kiosk"
  ON public.device_activations
  FOR SELECT
  TO anon
  USING (
    upper(trim(code)) ~ '^QM-[A-HJ-NP-Z2-9]{4}$'
  );

-- ────────────────────────────────────────────────────────────
-- C3 — Backfill profiles for auth users without a profile row
-- ────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, venue_name, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'venue_name', '')), ''),
  'owner'
FROM auth.users u
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;


-- =====================================================================
-- >>> 20260613180000_security_hardening_v2.sql
-- =====================================================================
-- ============================================================
-- Security Hardening v2 — Production Grade (RPC-first)
-- Requires: 20260613120000_security_critical_rpc_rls.sql
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1) Rate-limit storage (no API access — SECURITY DEFINER only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kiosk_rate_limits (
  scope_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempt_count int NOT NULL DEFAULT 0,
  fail_count int NOT NULL DEFAULT 0,
  locked_until timestamptz
);

ALTER TABLE public.kiosk_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kiosk_rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.kiosk_rate_limits FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 2) Helpers — normalize, rate limit, internal gate
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kiosk_normalize_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(trim(COALESCE(p_code, '')));
$$;

CREATE OR REPLACE FUNCTION public.kiosk_client_scope()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text;
BEGIN
  BEGIN
    v_ip := nullif(trim(split_part(
      coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for',
      ',', 1
    )), '');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := coalesce(inet_client_addr()::text, 'unknown');
  END IF;

  RETURN 'ip:' || v_ip;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_client_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_client_scope() TO anon, authenticated, service_role;

-- Helper: rate-limit check for one scope (keeps guard small for SQL Editor / API limits)
CREATE OR REPLACE FUNCTION public._kiosk_rate_limit_one_scope(
  p_scope text,
  p_now timestamptz,
  p_max_attempts int,
  p_max_fails int,
  p_window interval,
  p_fail_window interval,
  p_lock_short interval,
  p_lock_long interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.kiosk_rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.kiosk_rate_limits AS k (scope_key, window_start, attempt_count, fail_count)
  VALUES (p_scope, p_now, 0, 0)
  ON CONFLICT (scope_key) DO NOTHING;

  SELECT * INTO v_row
  FROM public.kiosk_rate_limits
  WHERE scope_key = p_scope
  FOR UPDATE;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > p_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'rate_limited',
      'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_row.locked_until - p_now))::int)
    );
  END IF;

  IF v_row.window_start < p_now - p_window THEN
    UPDATE public.kiosk_rate_limits
    SET window_start = p_now, attempt_count = 0, fail_count = 0, locked_until = NULL
    WHERE scope_key = p_scope;
    v_row.attempt_count := 0;
    v_row.fail_count := 0;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    UPDATE public.kiosk_rate_limits
    SET locked_until = p_now + p_lock_short
    WHERE scope_key = p_scope;
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'rate_limited',
      'retry_after_seconds', EXTRACT(EPOCH FROM p_lock_short)::int
    );
  END IF;

  IF v_row.fail_count >= p_max_fails AND v_row.window_start >= p_now - p_fail_window THEN
    UPDATE public.kiosk_rate_limits
    SET locked_until = p_now + p_lock_long
    WHERE scope_key = p_scope;
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'rate_limited',
      'retry_after_seconds', EXTRACT(EPOCH FROM p_lock_long)::int
    );
  END IF;

  UPDATE public.kiosk_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE scope_key = p_scope;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._kiosk_rate_limit_one_scope(text, timestamptz, int, int, interval, interval, interval, interval) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_guard(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_code text := public.kiosk_normalize_code(p_code);
  v_blocked jsonb;
  v_window interval := interval '10 minutes';
  v_fail_window interval := interval '5 minutes';
  v_lock_short interval := interval '5 minutes';
  v_lock_long interval := interval '15 minutes';
BEGIN
  IF v_code = '' OR v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN NULL;
  END IF;

  v_blocked := public._kiosk_rate_limit_one_scope(
    'code:' || v_code, v_now, 120, 15, v_window, v_fail_window, v_lock_short, v_lock_long
  );
  IF v_blocked IS NOT NULL THEN
    RETURN v_blocked;
  END IF;

  v_blocked := public._kiosk_rate_limit_one_scope(
    public.kiosk_client_scope(), v_now, 400, 15, v_window, v_fail_window, v_lock_short, v_lock_long
  );
  IF v_blocked IS NOT NULL THEN
    RETURN v_blocked;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_guard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_guard(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_record_failure(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_code);
  v_scope text;
BEGIN
  IF v_code = '' THEN RETURN; END IF;
  FOREACH v_scope IN ARRAY ARRAY['code:' || v_code, public.kiosk_client_scope()] LOOP
    UPDATE public.kiosk_rate_limits
    SET fail_count = fail_count + 1
    WHERE scope_key = v_scope;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_record_failure(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_record_failure(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._kiosk_gate_internal(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_device_code);
  v_owner_id uuid;
  v_device_status public.device_license_status;
  v_menu_type text;
  v_access jsonb;
  v_updated_at timestamptz;
BEGIN
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'invalid_code',
      'menu_type', NULL,
      'venue_updated_at', NULL,
      'subscription_status', NULL
    );
  END IF;

  SELECT da.owner_id, da.status, da.menu_type::text
  INTO v_owner_id, v_device_status, v_menu_type
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = v_code
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'device_not_registered',
      'menu_type', NULL,
      'venue_updated_at', NULL,
      'subscription_status', NULL
    );
  END IF;

  SELECT v.updated_at INTO v_updated_at
  FROM public.venues v
  WHERE v.owner_id = v_owner_id
  LIMIT 1;

  IF v_device_status <> 'active' THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object('code', v_code, 'reason', 'device_inactive')
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', 'device_inactive',
      'menu_type', v_menu_type,
      'venue_updated_at', v_updated_at,
      'subscription_status', NULL,
      '_owner_id', v_owner_id
    );
  END IF;

  v_access := public.resolve_subscription_access(v_owner_id);

  IF NOT coalesce((v_access->>'kiosk_allowed')::boolean, false) THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object(
        'code', v_code,
        'reason', v_access->>'reason',
        'status', v_access->>'status'
      )
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', coalesce(v_access->>'reason', 'subscription_' || (v_access->>'status')),
      'menu_type', v_menu_type,
      'venue_updated_at', v_updated_at,
      'subscription_status', v_access->>'status',
      '_owner_id', v_owner_id,
      '_access', v_access
    );
  END IF;

  UPDATE public.device_activations
  SET last_seen_at = now()
  WHERE upper(trim(code)) = v_code;

  RETURN jsonb_build_object(
    'allowed', true,
    'registered', true,
    'reason', NULL,
    'menu_type', v_menu_type,
    'venue_updated_at', v_updated_at,
    'subscription_status', v_access->>'status',
    '_owner_id', v_owner_id,
    '_access', v_access
  );
END;
$$;

REVOKE ALL ON FUNCTION public._kiosk_gate_internal(text) FROM PUBLIC;

-- ────────────────────────────────────────────────────────────
-- 3) Public kiosk RPCs
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_kiosk_state(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_gate->>'reason',
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kiosk_state(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_kiosk_venue(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_data jsonb;
  v_owner uuid;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
    RETURN NULL;
  END IF;

  v_owner := (v_gate->>'_owner_id')::uuid;
  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT v.data INTO v_data
  FROM public.venues v
  WHERE v.owner_id = v_owner
  LIMIT 1;

  RETURN v_data;
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_venue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kiosk_venue(text) TO anon, authenticated;

-- Backward-compatible wrappers
CREATE OR REPLACE FUNCTION public.check_kiosk_access(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_rate jsonb;
  v_gate jsonb;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_device_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_device_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_device_code);
  END IF;

  IF v_uid IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', coalesce((v_gate->>'allowed')::boolean, false),
      'registered', coalesce((v_gate->>'registered')::boolean, false),
      'reason', v_gate->>'reason',
      'access', v_gate->'_access',
      'owner_id', v_gate->>'_owner_id'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_gate->>'reason',
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_kiosk_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_kiosk_access(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_for_device(device_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_kiosk_venue(device_code);
$$;

REVOKE ALL ON FUNCTION public.get_venue_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_for_device(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_updated_at_for_device(device_code text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(public.get_kiosk_state(device_code)->>'venue_updated_at', '')::timestamptz;
$$;

REVOKE ALL ON FUNCTION public.get_venue_updated_at_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_updated_at_for_device(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_device_activated(device_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((public.get_kiosk_state(device_code)->>'allowed')::boolean, false);
$$;

REVOKE ALL ON FUNCTION public.is_device_activated(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_device_activated(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(public.get_kiosk_state(device_code)->>'menu_type', '');
$$;

REVOKE ALL ON FUNCTION public.get_device_menu_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_device_menu_type(text) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4) Owner venue RPCs (dashboard — no direct table SELECT)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_owner_venue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_data jsonb;
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.data, v.updated_at INTO v_data, v_updated
  FROM public.venues v
  WHERE v.owner_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('data', v_data, 'updated_at', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_venue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_venue() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_owner_venue_updated_at()
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.updated_at INTO v_updated
  FROM public.venues v
  WHERE v.owner_id = v_uid
  LIMIT 1;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_venue_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_venue_updated_at() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5) RPC-only: revoke direct table access (anon + authenticated)
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_anon_kiosk_select" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
DROP POLICY IF EXISTS "venues_select_anon_kiosk" ON public.venues;
DROP POLICY IF EXISTS "venues_anon_kiosk_select" ON public.venues;

REVOKE ALL ON TABLE public.venues FROM anon, authenticated;
REVOKE ALL ON TABLE public.device_activations FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscriptions FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 6) Harden RLS policies — (select auth.uid())
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "venues_select_own" ON public.venues;
CREATE POLICY "venues_select_own"
  ON public.venues FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "device_activations_select_own" ON public.device_activations;
CREATE POLICY "device_activations_select_own"
  ON public.device_activations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own"
  ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_select_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_select_own"
  ON public.device_pairing_sessions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_insert_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_insert_own"
  ON public.device_pairing_sessions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_delete_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_delete_own"
  ON public.device_pairing_sessions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ────────────────────────────────────────────────────────────
-- 7) Purge old rate-limit rows (inline, no cron required)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kiosk_purge_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.kiosk_rate_limits
  WHERE window_start < now() - interval '24 hours'
    AND (locked_until IS NULL OR locked_until < now());
$$;

REVOKE ALL ON FUNCTION public.kiosk_purge_rate_limits() FROM PUBLIC;

SELECT public.kiosk_purge_rate_limits();

COMMIT;


-- =====================================================================
-- >>> 20260614120000_manual_subscription_admin.sql
-- =====================================================================
-- ============================================================
-- Manual subscription + platform admin (production SaaS)
-- Replaces online billing with 7-day trial + admin activation
-- ============================================================

BEGIN;

-- ── 1) Admin roles ──────────────────────────────────────────

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

DROP TRIGGER IF EXISTS admin_users_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

-- ── 2) Admin logs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_users (user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_logs_admin_created_idx
  ON public.admin_logs (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_target_idx
  ON public.admin_logs (target_owner_id, created_at DESC);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_logs FROM anon, authenticated;

-- ── 3) Subscription history ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  previous_status public.subscription_status,
  new_status public.subscription_status NOT NULL,
  previous_device_limit INT,
  new_device_limit INT,
  previous_subscription_ends_at TIMESTAMPTZ,
  new_subscription_ends_at TIMESTAMPTZ,
  changed_by UUID,
  change_source TEXT NOT NULL DEFAULT 'system',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_history_owner_idx
  ON public.subscription_history (owner_id, created_at DESC);

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscription_history FROM PUBLIC;
REVOKE ALL ON TABLE public.subscription_history FROM anon, authenticated;

-- ── 4) Subscription + profile columns ───────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES public.admin_users (user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_activation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS device_limit INT;

UPDATE public.subscriptions
SET
  trial_started_at = COALESCE(trial_started_at, created_at),
  subscription_started_at = COALESCE(subscription_started_at, current_period_start),
  subscription_ends_at = COALESCE(subscription_ends_at, current_period_end),
  device_limit = COALESCE(device_limit, screen_count, 1)
WHERE trial_started_at IS NULL
   OR device_limit IS NULL
   OR subscription_ends_at IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- ── 5) Helpers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.subscription_device_limit(p_sub public.subscriptions)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(0, COALESCE(p_sub.device_limit, p_sub.screen_count, 0));
$$;

CREATE OR REPLACE FUNCTION public.effective_screen_count(
  p_status public.subscription_status,
  p_screen_count INT
)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_status = 'trial' THEN 1
    ELSE GREATEST(0, COALESCE(p_screen_count, 0))
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_subscription_history(
  p_owner_id UUID,
  p_previous public.subscriptions,
  p_new public.subscriptions,
  p_changed_by UUID,
  p_source TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.subscription_history (
    owner_id,
    previous_status,
    new_status,
    previous_device_limit,
    new_device_limit,
    previous_subscription_ends_at,
    new_subscription_ends_at,
    changed_by,
    change_source,
    notes
  ) VALUES (
    p_owner_id,
    p_previous.status,
    p_new.status,
    public.subscription_device_limit(p_previous),
    public.subscription_device_limit(p_new),
    p_previous.subscription_ends_at,
    p_new.subscription_ends_at,
    p_changed_by,
    p_source,
    p_notes
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_subscription_history(UUID, public.subscriptions, public.subscriptions, UUID, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.touch_owner_activity(p_owner_id UUID DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_owner_id IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
  SET last_activity_at = NOW(), updated_at = NOW()
  WHERE id = p_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_owner_activity(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_owner_activity(UUID) TO authenticated;

-- ── 6) Admin auth helpers ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS public.admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.admin_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_role_rank(p_role public.admin_role)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'support' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'super_admin' THEN 3
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_require_role(p_min public.admin_role)
RETURNS public.admin_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.admin_role;
BEGIN
  v_role := public.get_admin_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'admin_forbidden';
  END IF;
  IF public.admin_role_rank(v_role) < public.admin_role_rank(p_min) THEN
    RAISE EXCEPTION 'admin_insufficient_role';
  END IF;
  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_require_role(public.admin_role) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.write_admin_log(
  p_admin_id UUID,
  p_action TEXT,
  p_target_owner_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, target_owner_id, metadata)
  VALUES (p_admin_id, p_action, p_target_owner_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_admin_log(UUID, TEXT, UUID, JSONB) FROM PUBLIC;

-- ── 7) Trial = 7 days, strict state machine ─────────────────

CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  s_prev public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  s_prev := s;

  -- Trial expired
  IF s.status = 'trial'
     AND s.trial_ends_at IS NOT NULL
     AND s.trial_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id
    RETURNING * INTO s;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'trial'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    PERFORM public.record_subscription_history(p_owner_id, s_prev, s, NULL, 'system', 'trial_expired');
    RETURN 'expired';
  END IF;

  -- Active subscription ended
  IF s.status = 'active'
     AND s.subscription_ends_at IS NOT NULL
     AND s.subscription_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id
    RETURNING * INTO s;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'active'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    PERFORM public.record_subscription_history(p_owner_id, s_prev, s, NULL, 'system', 'subscription_ended');
    RETURN 'expired';
  END IF;

  RETURN s.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_subscription_access(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_status public.subscription_status;
  v_active_devices INT;
  v_screen_count INT;
  v_allowed BOOLEAN;
BEGIN
  PERFORM public.refresh_subscription_state(p_owner_id);

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'kiosk_allowed', false,
      'dashboard_allowed', false,
      'dashboard_edit_allowed', false,
      'can_add_devices', false,
      'status', 'expired',
      'reason', 'no_subscription',
      'screen_count', 0,
      'active_device_count', 0,
      'device_limit', 0,
      'banner', 'expired'
    );
  END IF;

  v_status := s.status;
  v_screen_count := public.effective_screen_count(v_status, public.subscription_device_limit(s));

  PERFORM public.enforce_owner_device_limits(p_owner_id);

  SELECT COUNT(*)::INT INTO v_active_devices
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  v_allowed := v_status IN ('trial', 'active');

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'kiosk_allowed', v_allowed,
    'dashboard_allowed', v_allowed,
    'dashboard_edit_allowed', v_allowed,
    'can_add_devices', v_allowed AND v_active_devices < v_screen_count,
    'status', v_status::text,
    'reason', CASE WHEN v_allowed THEN NULL ELSE 'subscription_' || v_status::text END,
    'screen_count', v_screen_count,
    'device_limit', public.subscription_device_limit(s),
    'active_device_count', v_active_devices,
    'trial_started_at', s.trial_started_at,
    'trial_ends_at', s.trial_ends_at,
    'subscription_started_at', s.subscription_started_at,
    'subscription_ends_at', s.subscription_ends_at,
    'manual_activation', s.manual_activation,
    'banner', CASE v_status
      WHEN 'trial' THEN 'trial'
      WHEN 'active' THEN NULL
      WHEN 'suspended' THEN 'suspended'
      WHEN 'expired' THEN 'expired'
      WHEN 'canceled' THEN 'canceled'
      ELSE 'error'
    END
  );
END;
$$;

-- ── 8) Create subscription on signup (7-day trial) ──────────

CREATE OR REPLACE FUNCTION public.ensure_subscription_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.subscriptions (
    owner_id,
    status,
    screen_count,
    device_limit,
    trial_started_at,
    trial_ends_at,
    manual_activation
  )
  VALUES (
    v_uid,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.subscriptions (
    owner_id,
    status,
    screen_count,
    device_limit,
    trial_started_at,
    trial_ends_at,
    manual_activation
  )
  VALUES (
    NEW.id,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 9) Owner subscription fetch ─────────────────────────────

CREATE OR REPLACE FUNCTION public.get_owner_subscription()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  s public.subscriptions%ROWTYPE;
  v_access JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.touch_owner_activity(v_uid);
  PERFORM public.ensure_subscription_for_owner();

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = v_uid;
  v_access := public.resolve_subscription_access(v_uid);

  RETURN jsonb_build_object(
    'owner_id', v_uid,
    'status', s.status::text,
    'screen_count', public.subscription_device_limit(s),
    'device_limit', public.subscription_device_limit(s),
    'trial_started_at', s.trial_started_at,
    'trial_ends_at', s.trial_ends_at,
    'subscription_started_at', s.subscription_started_at,
    'subscription_ends_at', s.subscription_ends_at,
    'manual_activation', s.manual_activation,
    'activated_at', s.activated_at,
    'notes', s.notes,
    'access', v_access
  );
END;
$$;

-- ── 10) Block dashboard preview when expired ─────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_preview_venue()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  IF NOT COALESCE((v_access->>'dashboard_allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_blocked', 'access', v_access);
  END IF;

  SELECT data INTO v_data FROM public.venues WHERE owner_id = v_uid;
  RETURN jsonb_build_object('ok', true, 'data', COALESCE(v_data, '{}'::jsonb), 'access', v_access);
END;
$$;

-- ── 11) Remove billing webhooks ─────────────────────────────

DROP FUNCTION IF EXISTS public.confirm_subscription_payment(INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_billing_webhook(UUID, TEXT, JSONB);

-- ── 12) Admin: profile check ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_admin_profile()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.admin_role;
  au public.admin_users%ROWTYPE;
BEGIN
  v_role := public.get_admin_role();
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('is_admin', false);
  END IF;

  SELECT * INTO au FROM public.admin_users WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'is_admin', true,
    'user_id', au.user_id,
    'role', au.role::text,
    'email', au.email,
    'full_name', au.full_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_admin_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_admin_profile() TO authenticated;

-- ── 13) Admin dashboard stats ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  PERFORM public.admin_require_role('support');

  RETURN jsonb_build_object(
    'total_customers', (SELECT COUNT(*)::int FROM public.profiles),
    'active_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'active'),
    'trial_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'trial'),
    'expired_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'expired'),
    'suspended_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'suspended'),
    'total_devices', (SELECT COUNT(*)::int FROM public.device_activations WHERE status = 'active'),
    'new_registrations_7d', (
      SELECT COUNT(*)::int FROM public.profiles
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT al.action, al.metadata, al.created_at, al.owner_id
        FROM public.audit_logs al
        ORDER BY al.created_at DESC
        LIMIT 20
      ) t
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;

-- ── 14) Admin list customers ────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
  v_total INT;
BEGIN
  PERFORM public.admin_require_role('support');

  SELECT COUNT(*)::int INTO v_total
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.owner_id = p.id
  WHERE (p_search IS NULL OR p_search = '' OR
         p.email ILIKE '%' || p_search || '%' OR
         COALESCE(p.full_name, '') ILIKE '%' || p_search || '%' OR
         COALESCE(p.venue_name, '') ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status);

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.created_at AS registration_date,
      p.last_activity_at,
      u.last_sign_in_at AS last_login,
      s.status::text AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      public.subscription_device_limit(s) AS device_limit,
      s.manual_activation,
      s.notes,
      p.internal_notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      (SELECT COALESCE(jsonb_array_length(v.data->'products'), 0)::int
       FROM public.venues v WHERE v.owner_id = p.id) AS product_count
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE (p_search IS NULL OR p_search = '' OR
           p.email ILIKE '%' || p_search || '%' OR
           COALESCE(p.full_name, '') ILIKE '%' || p_search || '%' OR
           COALESCE(p.venue_name, '') ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status)
    ORDER BY p.created_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200))
    OFFSET GREATEST(0, p_offset)
  ) t;

  RETURN jsonb_build_object('total', v_total, 'customers', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) TO authenticated;

-- ── 15) Admin customer detail ───────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_customer(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer JSONB;
  v_history JSONB;
BEGIN
  PERFORM public.admin_require_role('support');

  SELECT row_to_json(t)::jsonb INTO v_customer
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.role,
      p.created_at AS registration_date,
      p.last_activity_at,
      p.internal_notes,
      u.last_sign_in_at AS last_login,
      s.status::text AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      public.subscription_device_limit(s) AS device_limit,
      s.manual_activation,
      s.activated_by,
      s.activated_at,
      s.notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      (SELECT COALESCE(jsonb_array_length(v.data->'products'), 0)::int
       FROM public.venues v WHERE v.owner_id = p.id) AS product_count,
      public.resolve_subscription_access(p.id) AS access
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_owner_id
  ) t;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM public.subscription_history
    WHERE owner_id = p_owner_id
    ORDER BY created_at DESC
    LIMIT 50
  ) h;

  RETURN jsonb_build_object('ok', true, 'customer', v_customer, 'history', v_history);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_customer(UUID) TO authenticated;

-- ── 16) Admin mutate subscription ───────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  p_owner_id UUID,
  p_action TEXT,
  p_device_limit INT DEFAULT NULL,
  p_subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_role public.admin_role;
  s_prev public.subscriptions%ROWTYPE;
  s_new public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_role := public.admin_require_role('admin');

  SELECT * INTO s_prev FROM public.subscriptions WHERE owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_not_found');
  END IF;

  IF p_internal_notes IS NOT NULL THEN
    UPDATE public.profiles SET internal_notes = p_internal_notes WHERE id = p_owner_id;
  END IF;

  CASE p_action
    WHEN 'activate' THEN
      UPDATE public.subscriptions SET
        status = 'active',
        manual_activation = true,
        activated_by = v_admin,
        activated_at = v_now,
        subscription_started_at = COALESCE(subscription_started_at, v_now),
        subscription_ends_at = COALESCE(p_subscription_ends_at, subscription_ends_at, v_now + INTERVAL '30 days'),
        device_limit = COALESCE(p_device_limit, device_limit, screen_count, 1),
        screen_count = COALESCE(p_device_limit, device_limit, screen_count, 1),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'suspend' THEN
      UPDATE public.subscriptions SET
        status = 'suspended',
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;
      PERFORM public.deactivate_all_devices_for_owner(p_owner_id);

    WHEN 'disable' THEN
      UPDATE public.subscriptions SET
        status = 'canceled',
        canceled_at = v_now,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;
      PERFORM public.deactivate_all_devices_for_owner(p_owner_id);

    WHEN 'extend' THEN
      IF p_subscription_ends_at IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'subscription_ends_at_required');
      END IF;
      UPDATE public.subscriptions SET
        status = CASE WHEN status IN ('expired', 'suspended', 'canceled') THEN 'active' ELSE status END,
        subscription_ends_at = p_subscription_ends_at,
        manual_activation = true,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'reset_trial' THEN
      UPDATE public.subscriptions SET
        status = 'trial',
        trial_started_at = v_now,
        trial_ends_at = v_now + INTERVAL '7 days',
        manual_activation = false,
        activated_by = NULL,
        activated_at = NULL,
        subscription_started_at = NULL,
        subscription_ends_at = NULL,
        device_limit = COALESCE(p_device_limit, 1),
        screen_count = COALESCE(p_device_limit, 1),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'set_device_limit' THEN
      IF p_device_limit IS NULL OR p_device_limit < 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_device_limit');
      END IF;
      UPDATE public.subscriptions SET
        device_limit = p_device_limit,
        screen_count = p_device_limit,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;
      PERFORM public.enforce_owner_device_limits(p_owner_id);

    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'unknown_action');
  END CASE;

  PERFORM public.record_subscription_history(
    p_owner_id, s_prev, s_new, v_admin, 'admin:' || p_action, p_notes
  );
  PERFORM public.write_admin_log(
    v_admin,
    'subscription.' || p_action,
    p_owner_id,
    jsonb_build_object(
      'previous_status', s_prev.status,
      'new_status', s_new.status,
      'device_limit', public.subscription_device_limit(s_new)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'customer', (public.admin_get_customer(p_owner_id)->'customer'),
    'access', public.resolve_subscription_access(p_owner_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

COMMIT;


-- =====================================================================
-- >>> 20260614130000_fix_subscription_rpc_volatility.sql
-- =====================================================================
-- Fix: get_owner_subscription must be VOLATILE (it UPDATEs via touch_owner_activity,
-- ensure_subscription_for_owner, and resolve_subscription_access → refresh_subscription_state).
-- Error without this fix: 25006 cannot execute UPDATE in a read-only transaction

BEGIN;

CREATE OR REPLACE FUNCTION public.get_owner_subscription()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  s public.subscriptions%ROWTYPE;
  v_access JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.touch_owner_activity(v_uid);
  PERFORM public.ensure_subscription_for_owner();

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = v_uid;
  v_access := public.resolve_subscription_access(v_uid);

  RETURN jsonb_build_object(
    'owner_id', v_uid,
    'status', s.status::text,
    'screen_count', public.subscription_device_limit(s),
    'device_limit', public.subscription_device_limit(s),
    'trial_started_at', s.trial_started_at,
    'trial_ends_at', s.trial_ends_at,
    'subscription_started_at', s.subscription_started_at,
    'subscription_ends_at', s.subscription_ends_at,
    'manual_activation', s.manual_activation,
    'activated_at', s.activated_at,
    'notes', s.notes,
    'access', v_access
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_preview_venue()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  IF NOT COALESCE((v_access->>'dashboard_allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_blocked', 'access', v_access);
  END IF;

  SELECT data INTO v_data FROM public.venues WHERE owner_id = v_uid;
  RETURN jsonb_build_object('ok', true, 'data', COALESCE(v_data, '{}'::jsonb), 'access', v_access);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_preview_venue() TO authenticated;

COMMIT;


-- =====================================================================
-- >>> 20260614140000_production_security_hardening.sql
-- =====================================================================
-- Production security hardening: indexes, RPC grants, audit on trial start
BEGIN;

-- Performance indexes for admin dashboards
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_trial_ends_at_idx ON public.subscriptions (trial_ends_at)
  WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS subscriptions_subscription_ends_at_idx
  ON public.subscriptions (subscription_ends_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS profiles_last_activity_idx ON public.profiles (last_activity_at DESC NULLS LAST);

-- Ensure sensitive admin helpers are not callable by anon
REVOKE ALL ON FUNCTION public.get_admin_role() FROM anon;
REVOKE ALL ON FUNCTION public.admin_require_role(public.admin_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_admin_log(UUID, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_subscription_history(UUID, public.subscriptions, public.subscriptions, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Block direct table writes on admin/subscription audit tables (defense in depth)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.admin_users FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.admin_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscription_history FROM anon, authenticated;

-- Log trial start when subscription row is first created
CREATE OR REPLACE FUNCTION public.ensure_subscription_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
  v_new_owner UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.subscriptions (
    owner_id,
    status,
    screen_count,
    device_limit,
    trial_started_at,
    trial_ends_at,
    manual_activation
  )
  VALUES (
    v_uid,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING owner_id INTO v_new_owner;

  IF v_new_owner IS NOT NULL THEN
    PERFORM public.write_audit_log(
      v_uid,
      'subscription.trial_started',
      jsonb_build_object('trial_ends_at', v_now + INTERVAL '7 days')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_subscription_for_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_subscription_for_owner() TO authenticated;

COMMIT;


-- =====================================================================
-- >>> 20260614150000_final_production_hardening.sql
-- =====================================================================
-- Final production hardening: protect internal_notes, fix admin stats, tighten grants
BEGIN;

-- Owners must not update internal_notes (admin-only field)
CREATE OR REPLACE FUNCTION public.profiles_block_internal_notes_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     AND COALESCE(public.get_admin_role()::text, '') NOT IN ('admin', 'super_admin')
  THEN
    NEW.internal_notes := OLD.internal_notes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_internal_notes ON public.profiles;
CREATE TRIGGER profiles_protect_internal_notes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_internal_notes_self_update();

-- Admin dashboard: recent activity from audit + admin logs (no broken columns)
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require_role('support');

  RETURN jsonb_build_object(
    'total_customers', (SELECT COUNT(*)::int FROM public.profiles),
    'active_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'active'),
    'trial_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'trial'),
    'expired_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'expired'),
    'suspended_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'suspended'),
    'total_devices', (SELECT COUNT(*)::int FROM public.device_activations WHERE status = 'active'),
    'new_registrations_7d', (
      SELECT COUNT(*)::int FROM public.profiles
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT action, metadata, created_at, owner_id
        FROM (
          SELECT al.action, al.metadata, al.created_at, al.owner_id
          FROM public.audit_logs al
          UNION ALL
          SELECT
            'admin.' || al.action,
            al.metadata,
            al.created_at,
            al.target_owner_id AS owner_id
          FROM public.admin_logs al
        ) combined
        ORDER BY created_at DESC
        LIMIT 30
      ) t
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;

-- Prevent authenticated direct INSERT into subscriptions (RPC-only creation)
REVOKE INSERT ON TABLE public.subscriptions FROM anon, authenticated;

-- Sanitize admin search input length in RPC
CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
  v_total INT;
  v_search TEXT;
  v_limit INT;
  v_offset INT;
BEGIN
  PERFORM public.admin_require_role('support');

  v_search := NULLIF(BTRIM(LEFT(COALESCE(p_search, ''), 120)), '');
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT COUNT(*)::int INTO v_total
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.owner_id = p.id
  WHERE (v_search IS NULL OR
         p.email ILIKE '%' || v_search || '%' OR
         COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
         COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
    AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status);

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.created_at AS registration_date,
      p.last_activity_at,
      u.last_sign_in_at AS last_login,
      s.status::text AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      public.subscription_device_limit(s) AS device_limit,
      s.manual_activation,
      s.notes,
      p.internal_notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      (SELECT COALESCE(jsonb_array_length(v.data->'products'), 0)::int
       FROM public.venues v WHERE v.owner_id = p.id) AS product_count
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE (v_search IS NULL OR
           p.email ILIKE '%' || v_search || '%' OR
           COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
           COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
      AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status)
    ORDER BY p.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('total', v_total, 'customers', v_rows, 'limit', v_limit, 'offset', v_offset);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) TO authenticated;

COMMIT;


-- =====================================================================
-- >>> 20260614160000_fix_admin_customers_rpc.sql
-- =====================================================================
-- Fix admin customer list/detail RPCs: avoid auth.users join, safe product counts
BEGIN;

-- Ensure profile columns referenced by admin RPCs exist (older DBs may lack phone)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

CREATE OR REPLACE FUNCTION public.venue_product_count(p_owner_id UUID)
RETURNS INT
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
  )::int
  FROM public.venues v
  WHERE v.owner_id = p_owner_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.venue_product_count(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
  v_total INT;
  v_search TEXT;
  v_limit INT;
  v_offset INT;
BEGIN
  PERFORM public.admin_require_role('support');

  v_search := NULLIF(BTRIM(LEFT(COALESCE(p_search, ''), 120)), '');
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT COUNT(*)::int INTO v_total
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.owner_id = p.id
  WHERE (v_search IS NULL OR
         p.email ILIKE '%' || v_search || '%' OR
         COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
         COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
    AND (
      p_status IS NULL OR p_status = '' OR
      COALESCE(s.status::text, 'expired') = p_status
    );

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.created_at AS registration_date,
      p.last_activity_at,
      NULL::timestamptz AS last_login,
      COALESCE(s.status::text, 'expired') AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      CASE
        WHEN s.owner_id IS NULL THEN 0
        ELSE public.subscription_device_limit(s)
      END AS device_limit,
      COALESCE(s.manual_activation, false) AS manual_activation,
      s.notes,
      p.internal_notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      public.venue_product_count(p.id) AS product_count
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    WHERE (v_search IS NULL OR
           p.email ILIKE '%' || v_search || '%' OR
           COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
           COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
      AND (
        p_status IS NULL OR p_status = '' OR
        COALESCE(s.status::text, 'expired') = p_status
      )
    ORDER BY p.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('total', v_total, 'customers', v_rows, 'limit', v_limit, 'offset', v_offset);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_customer(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer JSONB;
  v_history JSONB;
BEGIN
  PERFORM public.admin_require_role('support');

  SELECT row_to_json(t)::jsonb INTO v_customer
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.role,
      p.created_at AS registration_date,
      p.last_activity_at,
      p.internal_notes,
      NULL::timestamptz AS last_login,
      COALESCE(s.status::text, 'expired') AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      CASE
        WHEN s.owner_id IS NULL THEN 0
        ELSE public.subscription_device_limit(s)
      END AS device_limit,
      COALESCE(s.manual_activation, false) AS manual_activation,
      s.activated_by,
      s.activated_at,
      s.notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      public.venue_product_count(p.id) AS product_count,
      public.resolve_subscription_access(p.id) AS access
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    WHERE p.id = p_owner_id
  ) t;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM public.subscription_history
    WHERE owner_id = p_owner_id
    ORDER BY created_at DESC
    LIMIT 50
  ) h;

  RETURN jsonb_build_object('ok', true, 'customer', v_customer, 'history', v_history);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_customer(UUID) TO authenticated;

COMMIT;


-- =====================================================================
-- >>> 20260716000000_fix_kiosk_rpc_volatility.sql
-- =====================================================================
-- Fix: kiosk RPCs must be VOLATILE — they UPDATE last_seen_at / rate limits
-- (and call resolve_subscription_access which may UPDATE subscriptions).
-- Error without this fix: 0A000 UPDATE is not allowed in a non-volatile function
-- Triggered by: POST /rest/v1/rpc/get_kiosk_state → 400
--
-- Uses CREATE OR REPLACE (not only ALTER) so bodies stay correct if STABLE was re-applied.
-- Ends with PostgREST schema reload.

BEGIN;

CREATE OR REPLACE FUNCTION public._kiosk_gate_internal(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_device_code);
  v_owner_id uuid;
  v_device_status public.device_license_status;
  v_menu_type text;
  v_access jsonb;
  v_updated_at timestamptz;
BEGIN
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'invalid_code',
      'menu_type', NULL,
      'venue_updated_at', NULL,
      'subscription_status', NULL
    );
  END IF;

  SELECT da.owner_id, da.status, da.menu_type::text
  INTO v_owner_id, v_device_status, v_menu_type
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = v_code
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'device_not_registered',
      'menu_type', NULL,
      'venue_updated_at', NULL,
      'subscription_status', NULL
    );
  END IF;

  SELECT v.updated_at INTO v_updated_at
  FROM public.venues v
  WHERE v.owner_id = v_owner_id
  LIMIT 1;

  IF v_device_status <> 'active' THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object('code', v_code, 'reason', 'device_inactive')
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', 'device_inactive',
      'menu_type', v_menu_type,
      'venue_updated_at', v_updated_at,
      'subscription_status', NULL,
      '_owner_id', v_owner_id
    );
  END IF;

  v_access := public.resolve_subscription_access(v_owner_id);

  IF NOT coalesce((v_access->>'kiosk_allowed')::boolean, false) THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object(
        'code', v_code,
        'reason', v_access->>'reason',
        'status', v_access->>'status'
      )
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', coalesce(v_access->>'reason', 'subscription_' || (v_access->>'status')),
      'menu_type', v_menu_type,
      'venue_updated_at', v_updated_at,
      'subscription_status', v_access->>'status',
      '_owner_id', v_owner_id,
      '_access', v_access
    );
  END IF;

  UPDATE public.device_activations
  SET last_seen_at = now()
  WHERE upper(trim(code)) = v_code;

  RETURN jsonb_build_object(
    'allowed', true,
    'registered', true,
    'reason', NULL,
    'menu_type', v_menu_type,
    'venue_updated_at', v_updated_at,
    'subscription_status', v_access->>'status',
    '_owner_id', v_owner_id,
    '_access', v_access
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kiosk_state(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_gate->>'reason',
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kiosk_venue(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_data jsonb;
  v_owner uuid;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
    RETURN NULL;
  END IF;

  v_owner := (v_gate->>'_owner_id')::uuid;
  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT v.data INTO v_data
  FROM public.venues v
  WHERE v.owner_id = v_owner
  LIMIT 1;

  RETURN v_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_kiosk_access(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_rate jsonb;
  v_gate jsonb;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_device_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_device_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_device_code);
  END IF;

  IF v_uid IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', coalesce((v_gate->>'allowed')::boolean, false),
      'registered', coalesce((v_gate->>'registered')::boolean, false),
      'reason', v_gate->>'reason',
      'access', v_gate->'_access',
      'owner_id', v_gate->>'_owner_id'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_gate->>'reason',
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_venue_for_device(device_code text)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_kiosk_venue(device_code);
$$;

CREATE OR REPLACE FUNCTION public.get_venue_updated_at_for_device(device_code text)
RETURNS timestamptz
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(public.get_kiosk_state(device_code)->>'venue_updated_at', '')::timestamptz;
$$;

CREATE OR REPLACE FUNCTION public.is_device_activated(device_code text)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((public.get_kiosk_state(device_code)->>'allowed')::boolean, false);
$$;

CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(public.get_kiosk_state(device_code)->>'menu_type', '');
$$;

REVOKE ALL ON FUNCTION public._kiosk_gate_internal(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kiosk_state(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kiosk_venue(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_kiosk_access(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_venue_for_device(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_venue_updated_at_for_device(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_device_activated(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_device_menu_type(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_kiosk_state(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kiosk_venue(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_kiosk_access(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_venue_for_device(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_venue_updated_at_for_device(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_device_activated(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_menu_type(text) TO anon, authenticated;

COMMIT;

-- Verify: every row must show volatility = 'v' (volatile)
SELECT p.proname AS function_name,
       CASE p.provolatile
         WHEN 'i' THEN 'immutable'
         WHEN 's' THEN 'stable'
         WHEN 'v' THEN 'volatile'
       END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    '_kiosk_gate_internal',
    'get_kiosk_state',
    'get_kiosk_venue',
    'check_kiosk_access',
    'get_venue_for_device',
    'get_venue_updated_at_for_device',
    'is_device_activated',
    'get_device_menu_type'
  )
ORDER BY p.proname;

-- Force PostgREST to pick up new volatility (writable txn for these RPCs)
NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- >>> 20260716113000_kiosk_pairing_announce_and_rate_limit.sql
-- =====================================================================
-- Kiosk pairing: الجهاز يعلن الرمز أولاً — التفعيل من لوحة التحكم يتطلب ذلك
-- Fix: لا تُحسب حالة «بانتظار التفعيل» كفشل في rate limit (كانت تسبب «محاولات كثيرة»)

BEGIN;

CREATE TABLE IF NOT EXISTS public.kiosk_pairing_announcements (
  code text PRIMARY KEY,
  announced_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  CONSTRAINT kiosk_pairing_announcements_code_format CHECK (code ~ '^QM-[A-HJ-NP-Z2-9]{4}$')
);

CREATE INDEX IF NOT EXISTS kiosk_pairing_announcements_expires_idx
  ON public.kiosk_pairing_announcements (expires_at);

ALTER TABLE public.kiosk_pairing_announcements ENABLE ROW LEVEL SECURITY;

-- لا SELECT مباشر — الوصول عبر RPC فقط
REVOKE ALL ON TABLE public.kiosk_pairing_announcements FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.announce_kiosk_pairing_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_code);
BEGIN
  IF v_code = '' OR v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  INSERT INTO public.kiosk_pairing_announcements (code, announced_at, expires_at)
  VALUES (v_code, now(), now() + interval '30 minutes')
  ON CONFLICT (code) DO UPDATE SET
    announced_at = excluded.announced_at,
    expires_at = excluded.expires_at;

  RETURN jsonb_build_object('ok', true, 'code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_kiosk_pairing_announced(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kiosk_pairing_announcements kpa
    WHERE kpa.code = public.kiosk_normalize_code(p_code)
      AND kpa.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.announce_kiosk_pairing_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_kiosk_pairing_announced(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.announce_kiosk_pairing_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_kiosk_pairing_announced(text) TO authenticated;

-- لا تسجّل فشلاً عند انتظار التفعيل (polling طبيعي من التطبيق)
CREATE OR REPLACE FUNCTION public.get_kiosk_state(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_reason text;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);
  v_reason := v_gate->>'reason';

  IF NOT coalesce((v_gate->>'allowed')::boolean, false)
     AND v_reason IS DISTINCT FROM 'device_not_registered' THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_reason,
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

-- تفعيل جديد: يتطلب إعلان الرمز من الجهاز الفعلي
CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL,
  p_app_env TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev BOOLEAN := public.resolve_app_is_development(p_app_env);
  v_uid UUID;
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
  v_announced BOOLEAN;
BEGIN
  IF v_dev THEN
    v_uid := public.resolve_dev_owner_id();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'dev_mode', true,
        'error', 'no_dev_owner'
      );
    END IF;
  ELSE
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'not_authenticated'
      );
    END IF;
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_code'
    );
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    IF NOT v_dev THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'code_already_claimed'
    );
  END IF;

  IF v_existing_owner IS NULL AND NOT v_dev THEN
    SELECT public.is_kiosk_pairing_announced(v_code) INTO v_announced;

    IF NOT coalesce(v_announced, false) THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'device_not_announced')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'device_not_announced'
      );
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND upper(trim(dps.code)) = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'verification_code_invalid'
      );
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF NOT v_dev THEN
    IF v_existing_owner IS NULL THEN
      IF NOT (v_access->>'can_add_devices')::boolean THEN
        IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
          PERFORM public.write_audit_log(
            v_uid,
            'device.register_denied',
            jsonb_build_object('code', v_code, 'reason', 'screen_limit')
          );
          RETURN jsonb_build_object(
            'ok', false,
            'success', false,
            'error', 'screen_limit_exceeded',
            'access', v_access
          );
        END IF;
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'cannot_add_devices',
          'access', v_access
        );
      END IF;
    ELSIF v_existing_status <> 'active' THEN
      IF NOT (v_access->>'can_add_devices')::boolean
         AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'screen_limit_exceeded',
          'access', v_access
        );
      END IF;
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_menu_type'
    );
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  IF NOT v_dev THEN
    PERFORM public.consume_verification_code(v_code, v_uid);
    DELETE FROM public.kiosk_pairing_announcements WHERE code = v_code;
  END IF;
  PERFORM public.enforce_owner_device_limits(v_uid);

  IF NOT v_dev THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.registered',
      jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
    );
  END IF;

  v_access := public.resolve_subscription_access(v_uid);

  IF v_dev THEN
    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'dev_mode', true,
      'code', v_code,
      'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
      'access', v_access
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', v_access
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kiosk_state(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.register_device_with_license(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device_with_license(text, text, text, text) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

-- إزالة قفل «محاولات كثيرة» الناتج عن polling قبل الإصلاح
UPDATE public.kiosk_rate_limits
SET locked_until = NULL, fail_count = 0
WHERE locked_until IS NOT NULL OR fail_count > 0;

COMMIT;


-- =====================================================================
-- >>> 20260718035000_repair_create_device_verification_code.sql
-- =====================================================================
-- P1: Restore create_device_verification_code for PostgREST (dashboard 404 / PGRST202)
-- Idempotent: CREATE OR REPLACE + grants + schema reload

CREATE OR REPLACE FUNCTION public.create_device_verification_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

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
    SELECT 1
    FROM public.device_pairing_sessions
    WHERE upper(trim(code)) = upper(trim(p_code))
      AND expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.create_device_verification_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_device_verification_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_device_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_device_verification_code(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- >>> 20260720120000_signup_trial_repair.sql
-- =====================================================================
-- إصلاح تجربة 7 أيام للحسابات الجديدة (خلال 24 ساعة من الإنشاء)
-- يُستدعى من التطبيق بعد التسجيل إذا فشل الـ trigger

CREATE OR REPLACE FUNCTION public.repair_signup_trial()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_created TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT u.created_at INTO v_created
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_created IS NULL OR v_created < v_now - INTERVAL '24 hours' THEN
    RETURN;
  END IF;

  INSERT INTO public.subscriptions (
    owner_id,
    status,
    screen_count,
    device_limit,
    trial_started_at,
    trial_ends_at,
    manual_activation
  )
  VALUES (
    v_uid,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    status = 'trial',
    screen_count = 1,
    device_limit = 1,
    trial_started_at = v_now,
    trial_ends_at = v_now + INTERVAL '7 days',
    updated_at = v_now
  WHERE public.subscriptions.manual_activation = false
    AND public.subscriptions.status IN ('expired', 'canceled', 'suspended');
END;
$$;

REVOKE ALL ON FUNCTION public.repair_signup_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_signup_trial() TO authenticated;


-- =====================================================================
-- >>> 20260724120000_fix_subscription_extend_and_trial_expiry.sql
-- =====================================================================
-- إصلاح/إنشاء طبقة الاشتراك — شغّل كاملاً في SQL Editor
-- يعمل حتى لو جدول subscriptions غير موجود

BEGIN;

-- ── تشخيص سريع (نتائج في Notices) ─────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'schemas tables: %', (
    SELECT string_agg(tablename, ', ' ORDER BY tablename)
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename ILIKE '%subscr%'
  );
  RAISE NOTICE 'profiles exists: %', to_regclass('public.profiles') IS NOT NULL;
END $$;

-- ── أنواع ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'trial', 'active', 'past_due', 'grace_period', 'suspended', 'expired', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── جدول الاشتراكات ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'trial',
  screen_count INT NOT NULL DEFAULT 1 CHECK (screen_count >= 0),
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  price_per_screen_monthly NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
  price_per_screen_yearly NUMERIC(10, 2) NOT NULL DEFAULT 450.00,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- أعمدة الإدارة اليدوية
  trial_started_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  activated_by UUID,
  activated_at TIMESTAMPTZ,
  manual_activation BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  device_limit INT
);

-- أعمدة إضافية إن كان الجدول قديماً بدونها
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_activation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS device_limit INT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS screen_count INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- تأكد أن status من نوع الـ enum
DO $$
DECLARE
  v_udt TEXT;
BEGIN
  SELECT c.udt_name INTO v_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'subscriptions'
    AND c.column_name = 'status';

  IF v_udt IS NULL THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN status public.subscription_status NOT NULL DEFAULT 'trial';
  ELSIF v_udt IN ('text', 'varchar') THEN
    ALTER TABLE public.subscriptions ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.subscriptions
      ALTER COLUMN status TYPE public.subscription_status
      USING status::public.subscription_status;
    ALTER TABLE public.subscriptions
      ALTER COLUMN status SET DEFAULT 'trial'::public.subscription_status;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- صف اشتراك لكل بروفايل موجود (بدون الكتابة)
INSERT INTO public.subscriptions (
  owner_id,
  status,
  screen_count,
  device_limit,
  trial_started_at,
  trial_ends_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  'trial'::public.subscription_status,
  1,
  1,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.owner_id = p.id
)
ON CONFLICT (owner_id) DO NOTHING;

-- ── دوال مساعدة مبسّطة ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.subscription_device_limit(p_sub public.subscriptions)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(0, COALESCE(p_sub.device_limit, p_sub.screen_count, 1));
$$;

DROP FUNCTION IF EXISTS public.refresh_subscription_state(UUID);

CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- تجربة منتهية + تاريخ اشتراك مستقبلي → active
  IF s.status = 'trial'
     AND s.trial_ends_at IS NOT NULL
     AND s.trial_ends_at < v_now
  THEN
    IF s.subscription_ends_at IS NOT NULL AND s.subscription_ends_at > v_now THEN
      UPDATE public.subscriptions
      SET
        status = 'active',
        manual_activation = true,
        subscription_started_at = COALESCE(subscription_started_at, v_now),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s;
      RETURN 'active'::public.subscription_status;
    END IF;

    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id;
    RETURN 'expired'::public.subscription_status;
  END IF;

  -- اشتراك نشط انتهى
  IF s.status = 'active'
     AND s.subscription_ends_at IS NOT NULL
     AND s.subscription_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id;
    RETURN 'expired'::public.subscription_status;
  END IF;

  -- منتهٍ وله تاريخ ساري → أعد التفعيل
  IF s.status = 'expired'
     AND s.subscription_ends_at IS NOT NULL
     AND s.subscription_ends_at > v_now
  THEN
    UPDATE public.subscriptions
    SET
      status = 'active',
      manual_activation = true,
      subscription_started_at = COALESCE(subscription_started_at, v_now),
      updated_at = v_now
    WHERE owner_id = p_owner_id;
    RETURN 'active'::public.subscription_status;
  END IF;

  RETURN s.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_subscription_state(UUID) TO authenticated;

-- ── تحديث admin_update_subscription إن وُجدت صلاحيات الأدمن ─
DO $$
BEGIN
  IF to_regprocedure('public.admin_require_role(text)') IS NULL THEN
    RAISE NOTICE 'تخطي admin_update_subscription — admin_require_role غير موجودة';
    RETURN;
  END IF;

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.admin_update_subscription(
    p_owner_id UUID,
    p_action TEXT,
    p_device_limit INT DEFAULT NULL,
    p_subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_internal_notes TEXT DEFAULT NULL
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $body$
  DECLARE
    v_admin UUID := auth.uid();
    s_prev public.subscriptions%ROWTYPE;
    s_new public.subscriptions%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_ends TIMESTAMPTZ;
  BEGIN
    PERFORM public.admin_require_role('admin');

    SELECT * INTO s_prev FROM public.subscriptions WHERE owner_id = p_owner_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'subscription_not_found');
    END IF;

    IF p_internal_notes IS NOT NULL THEN
      BEGIN
        UPDATE public.profiles SET internal_notes = p_internal_notes WHERE id = p_owner_id;
      EXCEPTION WHEN undefined_column THEN NULL;
      END;
    END IF;

    v_ends := CASE
      WHEN p_subscription_ends_at IS NULL THEN NULL
      ELSE (p_subscription_ends_at::date + TIME '23:59:59') AT TIME ZONE 'UTC'
    END;

    CASE p_action
      WHEN 'activate' THEN
        UPDATE public.subscriptions SET
          status = 'active',
          manual_activation = true,
          activated_by = v_admin,
          activated_at = v_now,
          subscription_started_at = COALESCE(subscription_started_at, v_now),
          subscription_ends_at = COALESCE(v_ends, subscription_ends_at, v_now + INTERVAL '365 days'),
          device_limit = COALESCE(p_device_limit, device_limit, screen_count, 1),
          screen_count = COALESCE(p_device_limit, device_limit, screen_count, 1),
          notes = COALESCE(p_notes, notes),
          updated_at = v_now
        WHERE owner_id = p_owner_id
        RETURNING * INTO s_new;

      WHEN 'suspend' THEN
        UPDATE public.subscriptions SET
          status = 'suspended',
          notes = COALESCE(p_notes, notes),
          updated_at = v_now
        WHERE owner_id = p_owner_id
        RETURNING * INTO s_new;

      WHEN 'disable' THEN
        UPDATE public.subscriptions SET
          status = 'canceled',
          canceled_at = v_now,
          notes = COALESCE(p_notes, notes),
          updated_at = v_now
        WHERE owner_id = p_owner_id
        RETURNING * INTO s_new;

      WHEN 'extend' THEN
        IF v_ends IS NULL THEN
          RETURN jsonb_build_object('ok', false, 'error', 'subscription_ends_at_required');
        END IF;
        UPDATE public.subscriptions SET
          status = 'active',
          subscription_started_at = COALESCE(subscription_started_at, v_now),
          subscription_ends_at = v_ends,
          manual_activation = true,
          activated_by = COALESCE(activated_by, v_admin),
          activated_at = COALESCE(activated_at, v_now),
          notes = COALESCE(p_notes, notes),
          updated_at = v_now
        WHERE owner_id = p_owner_id
        RETURNING * INTO s_new;

      WHEN 'reset_trial' THEN
        UPDATE public.subscriptions SET
          status = 'trial',
          trial_started_at = v_now,
          trial_ends_at = v_now + INTERVAL '7 days',
          manual_activation = false,
          activated_by = NULL,
          activated_at = NULL,
          subscription_started_at = NULL,
          subscription_ends_at = NULL,
          device_limit = COALESCE(p_device_limit, 1),
          screen_count = COALESCE(p_device_limit, 1),
          notes = COALESCE(p_notes, notes),
          updated_at = v_now
        WHERE owner_id = p_owner_id
        RETURNING * INTO s_new;

      WHEN 'set_device_limit' THEN
        IF p_device_limit IS NULL OR p_device_limit < 0 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_device_limit');
        END IF;
        UPDATE public.subscriptions SET
          device_limit = p_device_limit,
          screen_count = p_device_limit,
          notes = COALESCE(p_notes, notes),
          updated_at = v_now
        WHERE owner_id = p_owner_id
        RETURNING * INTO s_new;

      ELSE
        RETURN jsonb_build_object('ok', false, 'error', 'unknown_action');
    END CASE;

    RETURN jsonb_build_object(
      'ok', true,
      'status', s_new.status::text,
      'subscription_ends_at', s_new.subscription_ends_at,
      'access', CASE
        WHEN to_regprocedure('public.resolve_subscription_access(uuid)') IS NOT NULL
          THEN public.resolve_subscription_access(p_owner_id)
        ELSE NULL
      END
    );
  END;
  $body$;
  $fn$;

  REVOKE ALL ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
END $$;

-- إصلاح الحسابات ذات تاريخ مستقبلي وحالة خاطئة
UPDATE public.subscriptions s
SET
  status = 'active',
  manual_activation = true,
  subscription_started_at = COALESCE(s.subscription_started_at, NOW()),
  updated_at = NOW()
WHERE s.subscription_ends_at IS NOT NULL
  AND s.subscription_ends_at > NOW()
  AND s.status::text IN ('trial', 'expired');

COMMIT;

-- تحقق سريع بعد التنفيذ:
-- SELECT owner_id, status, trial_ends_at, subscription_ends_at, manual_activation
-- FROM public.subscriptions
-- ORDER BY updated_at DESC
-- LIMIT 20;


-- =====================================================================
-- >>> 202607250001_platform_enums_and_helpers.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250002_create_media_system.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250003_create_storage_buckets.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250004_create_catalog_tables.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250005_create_cms_tables.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250006_create_settings_i18n.sql
-- =====================================================================
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

-- =====================================================================
-- >>> 202607250007_create_security_tables.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250008_create_documents.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250009_enhance_existing_tables.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250010_rls_policies.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250011_views_and_matviews.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250012_functions_triggers.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250013_indexes_performance.sql
-- =====================================================================
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


-- =====================================================================
-- >>> 202607250014_validation_security_fixes.sql
-- =====================================================================
-- =============================================================================
-- 202607250014 — Validation remediation (security + idempotency + authz)
-- Apply AFTER 001–013. Additive / safe. Does not drop business data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- C1: Tighten CMS / marketing public SELECT (no draft leaks to anon)
-- ---------------------------------------------------------------------------
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
  END LOOP;
END $$;

-- Published-only (or always-safe reference data)
CREATE POLICY landing_pages_public_read ON public.landing_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY pages_public_read ON public.pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY homepage_sections_public_read ON public.homepage_sections
  FOR SELECT TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY hero_sections_public_read ON public.hero_sections
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY sliders_public_read ON public.sliders
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY banners_public_read ON public.banners
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY cms_announcements_public_read ON public.cms_announcements
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY faqs_public_read ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY faq_categories_public_read ON public.faq_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY testimonials_public_read ON public.testimonials
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY partners_public_read ON public.partners
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY team_members_public_read ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY blog_categories_public_read ON public.blog_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY blogs_public_read ON public.blogs
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY news_public_read ON public.news
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY popups_public_read ON public.popups
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY seo_metadata_public_read ON public.seo_metadata
  FOR SELECT TO anon, authenticated
  USING (true); -- SEO fields are intended public; keep drafts out of CMS entities above

CREATE POLICY languages_public_read ON public.languages
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true);

CREATE POLICY translations_public_read ON public.translations
  FOR SELECT TO anon, authenticated
  USING (true);

-- feature_flags: authenticated only (never anon); no full payload leak to public
DROP POLICY IF EXISTS feature_flags_public_read ON public.feature_flags;
CREATE POLICY feature_flags_authenticated_read ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS page_blocks_public_read ON public.page_blocks;
CREATE POLICY page_blocks_public_read ON public.page_blocks
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      WHERE p.id = page_blocks.page_id
        AND p.status = 'published'
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS slider_slides_public_read ON public.slider_slides;
CREATE POLICY slider_slides_public_read ON public.slider_slides
  FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM public.sliders s
      WHERE s.id = slider_slides.slider_id
        AND s.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- H2: Lock down admin matview
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.mv_admin_platform_stats FROM PUBLIC;
REVOKE ALL ON TABLE public.mv_admin_platform_stats FROM anon, authenticated;
GRANT SELECT ON TABLE public.mv_admin_platform_stats TO service_role;

-- ---------------------------------------------------------------------------
-- H1 + C2: SECURITY DEFINER hardening (authz + REVOKE PUBLIC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.venue_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_owner_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(
    CASE
      WHEN jsonb_typeof(v.data->'products') = 'array'
        THEN jsonb_array_length(v.data->'products')
      ELSE 0
    END,
    0
  )::integer
  INTO v_count
  FROM public.venues v
  WHERE v.owner_id = p_owner_id
  LIMIT 1;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_owner_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.menu_products mp
    WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
  ) THEN
    RETURN (
      SELECT count(*)::integer FROM public.menu_products mp
      WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
    );
  END IF;

  RETURN public.venue_product_count(p_owner_id);
END;
$$;

-- M8: robust trial_days parse
CREATE OR REPLACE FUNCTION public.get_trial_days()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  n integer;
BEGIN
  v := public.get_system_config('trial_days', '7'::jsonb);
  BEGIN
    n := (v #>> '{}')::integer;
  EXCEPTION WHEN OTHERS THEN
    n := 7;
  END;
  IF n IS NULL OR n < 1 THEN
    n := 7;
  END IF;
  RETURN n;
END;
$$;

-- H7: storage path must be under caller uid
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

  IF split_part(p_storage_path, '/', 1) IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'invalid storage path: must start with auth.uid()';
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.activity_logs (owner_id, actor_id, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- REVOKE PUBLIC execute on sensitive DEFINER functions
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'venue_product_count','owner_product_count','write_activity_log',
        'register_media_asset','soft_delete_media_asset','refresh_admin_platform_stats',
        'get_system_config','get_trial_days','is_platform_admin'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.venue_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_activity_log(text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_media_asset(
  text, text, bigint, public.media_role, integer, integer, text, text, text, text, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_admin_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_config(text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_days() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- H4: Soft-fail phone check (skip if legacy rows violate)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format_chk;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_format_chk
    CHECK (
      phone IS NULL
      OR phone ~ '^\+?[0-9][0-9\s\-]{7,20}$'
    ) NOT VALID;
  -- Validate only new rows; optionally: VALIDATE CONSTRAINT later after cleanup
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'phone check not applied: existing rows violate format';
  WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'phone check skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- H5 soft: make admin-assets private-read for anon (keep authenticated public marketing optional)
-- Prefer signed/public only for intentionally public objects — tighten SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_assets_public_read" ON storage.objects;
DO $$
BEGIN
  CREATE POLICY "admin_assets_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'admin-assets');
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped admin-assets policy change (42501)';
  WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'Skipped admin-assets policy change';
    ELSE
      RAISE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- admin_users: mirror production revoke
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

COMMENT ON SCHEMA public IS
  'Meez public schema — validation remediation 202607250014 applied';


-- =====================================================================
-- >>> 20260814100000_kiosk_rate_limit_expected_states.sql
-- =====================================================================
-- لا تُحسب حالات الكiosk المتوقعة (انتظار تفعيل / فصل / اشتراك) كفشل rate-limit

CREATE OR REPLACE FUNCTION public.kiosk_should_count_rate_failure(p_reason text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_reason IS NOT NULL
     AND p_reason IS DISTINCT FROM 'device_not_registered'
     AND p_reason IS DISTINCT FROM 'device_inactive'
     AND p_reason NOT LIKE 'subscription_%';
$$;

REVOKE ALL ON FUNCTION public.kiosk_should_count_rate_failure(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_kiosk_state(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_reason text;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);
  v_reason := v_gate->>'reason';

  IF NOT coalesce((v_gate->>'allowed')::boolean, false)
     AND public.kiosk_should_count_rate_failure(v_reason) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_reason,
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kiosk_venue(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_data jsonb;
  v_owner uuid;
  v_reason text;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);
  v_reason := v_gate->>'reason';

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    IF public.kiosk_should_count_rate_failure(v_reason) THEN
      PERFORM public.kiosk_rate_limit_record_failure(p_code);
    END IF;
    RETURN NULL;
  END IF;

  v_owner := (v_gate->>'_owner_id')::uuid;
  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT v.data INTO v_data
  FROM public.venues v
  WHERE v.owner_id = v_owner
  LIMIT 1;

  RETURN v_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_kiosk_access(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_rate jsonb;
  v_gate jsonb;
  v_reason text;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_device_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_device_code);
  v_reason := v_gate->>'reason';

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    IF public.kiosk_should_count_rate_failure(v_reason) THEN
      PERFORM public.kiosk_rate_limit_record_failure(p_device_code);
    END IF;
  END IF;

  IF v_uid IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', coalesce((v_gate->>'allowed')::boolean, false),
      'registered', coalesce((v_gate->>'registered')::boolean, false),
      'reason', v_reason,
      'access', v_gate->'_access',
      'owner_id', v_gate->>'_owner_id'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_reason,
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_state(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kiosk_venue(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_kiosk_access(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_kiosk_state(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kiosk_venue(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_kiosk_access(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- >>> 20260814110000_disable_kiosk_rate_limit_lock.sql
-- =====================================================================
-- إزالة قفل rate-limit للكiosk بالكامل (لا حظر 5/15 دقيقة)

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_guard(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- معطّل عمدًا: لا قفل على أجهزة العرض
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_record_failure(p_code text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- معطّل عمدًا: لا تسجيل فشل ولا قفل
  RETURN;
END;
$$;

-- فك أي قفل قائم فورًا
UPDATE public.kiosk_rate_limits
SET locked_until = NULL,
    attempt_count = 0,
    fail_count = 0,
    window_start = now();

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_guard(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kiosk_rate_limit_record_failure(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_guard(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_record_failure(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

