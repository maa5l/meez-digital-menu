-- يوقف باقي لوقات not_authenticated من دوال اللوحة
-- لا يلمس venues.data ولا يحذف منتجات
-- نفّذ دفعة واحدة في SQL Editor

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
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  IF NOT COALESCE((v_access->>'dashboard_allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_blocked', 'access', v_access);
  END IF;

  SELECT data INTO v_data FROM public.venues WHERE owner_id = v_uid;
  RETURN jsonb_build_object('ok', true, 'data', COALESCE(v_data, '{}'::jsonb), 'access', v_access);
END;
$$;

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
    RETURN '[]'::jsonb;
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
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN;
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_action NOT IN (
    'auth.login',
    'auth.logout',
    'auth.register',
    'device.register_attempt',
    'device.activated',
    'device.registered',
    'menu.preview_open',
    'subscription.view',
    'dashboard.navigation'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN public.write_audit_log(v_uid, p_action, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_preview_venue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_preview_venue() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_preview_venue() TO authenticated;

REVOKE ALL ON FUNCTION public.list_owner_devices() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_owner_devices() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_owner_devices() TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_profile(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_profile(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.write_client_audit_log(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_client_audit_log(TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.write_client_audit_log(TEXT, JSONB) TO authenticated;

-- تأكيد المنتجات
SELECT
  u.email,
  COALESCE(jsonb_array_length(v.data->'products'), 0) AS products,
  COALESCE(jsonb_array_length(v.data->'categories'), 0) AS categories
FROM auth.users u
JOIN public.venues v ON v.owner_id = u.id
WHERE lower(u.email) = 's3oody16@gmail.com';
