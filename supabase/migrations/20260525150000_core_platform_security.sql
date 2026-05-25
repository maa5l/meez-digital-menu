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
