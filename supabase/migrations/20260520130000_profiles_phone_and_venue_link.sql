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
