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
