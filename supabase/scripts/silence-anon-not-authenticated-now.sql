-- يوقف لوقات not_authenticated (P0001) عندما الطلب بدون JWT
-- لا يلمس venues.data ولا يحذف أي منتجات
-- نفّذ دفعة واحدة في SQL Editor

CREATE OR REPLACE FUNCTION public.get_owner_venue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_data jsonb;
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
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

CREATE OR REPLACE FUNCTION public.get_owner_venue_updated_at()
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT v.updated_at
    FROM public.venues v
    WHERE v.owner_id = v_uid
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_venue_data(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
SET lock_timeout = '3s'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_updated_at TIMESTAMPTZ;
  v_stored_updated_at TEXT;
  v_incoming TEXT;
  v_existing_data JSONB;
  v_incoming_has_content BOOLEAN;
  v_existing_empty BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_data');
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  IF NOT COALESCE((v_access->>'dashboard_edit_allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_edit_blocked', 'access', v_access);
  END IF;

  IF NOT pg_try_advisory_xact_lock(872341, hashtext(v_uid::text)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'busy');
  END IF;

  v_incoming := NULLIF(p_data->>'updatedAt', '');
  v_incoming_has_content :=
    COALESCE(jsonb_typeof(p_data->'products') = 'array' AND jsonb_array_length(p_data->'products') > 0, false)
    OR COALESCE(jsonb_typeof(p_data->'categories') = 'array' AND jsonb_array_length(p_data->'categories') > 0, false)
    OR COALESCE(jsonb_typeof(p_data->'crops') = 'array' AND jsonb_array_length(p_data->'crops') > 0, false);

  SELECT v.updated_at, v.data, NULLIF(v.data->>'updatedAt', '')
  INTO v_updated_at, v_existing_data, v_stored_updated_at
  FROM public.venues v
  WHERE v.owner_id = v_uid;

  IF FOUND THEN
    v_existing_empty :=
      COALESCE(jsonb_typeof(v_existing_data->'products') <> 'array' OR jsonb_array_length(v_existing_data->'products') = 0, true)
      AND COALESCE(jsonb_typeof(v_existing_data->'categories') <> 'array' OR jsonb_array_length(v_existing_data->'categories') = 0, true)
      AND COALESCE(jsonb_typeof(v_existing_data->'crops') <> 'array' OR jsonb_array_length(v_existing_data->'crops') = 0, true);

    IF v_incoming IS NOT NULL
       AND v_stored_updated_at IS NOT NULL
       AND v_incoming < v_stored_updated_at
       AND NOT (v_incoming_has_content AND v_existing_empty) THEN
      RETURN jsonb_build_object('ok', true, 'updated_at', v_updated_at, 'skipped', 'stale');
    END IF;

    IF (NOT v_incoming_has_content) AND (NOT v_existing_empty) THEN
      RETURN jsonb_build_object('ok', true, 'updated_at', v_updated_at, 'skipped', 'empty_guard');
    END IF;

    UPDATE public.venues
    SET data = p_data, updated_at = NOW()
    WHERE owner_id = v_uid
    RETURNING updated_at INTO v_updated_at;
  ELSE
    INSERT INTO public.venues (owner_id, data)
    VALUES (v_uid, p_data)
    ON CONFLICT (owner_id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW()
    RETURNING updated_at INTO v_updated_at;
  END IF;

  RETURN jsonb_build_object('ok', true, 'updated_at', v_updated_at);
END;
$$;

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
    RETURN;
  END IF;

  INSERT INTO public.venues (owner_id, data)
  VALUES (v_uid, '{"version":1}'::jsonb)
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$;

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
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
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
    RETURN;
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

REVOKE ALL ON FUNCTION public.get_owner_venue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_venue() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_owner_venue() TO authenticated;

REVOKE ALL ON FUNCTION public.get_owner_venue_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_venue_updated_at() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_owner_venue_updated_at() TO authenticated;

REVOKE ALL ON FUNCTION public.update_venue_data(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_venue_data(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_venue_data(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_venue_for_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_venue_for_owner() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_venue_for_owner() TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_subscription_for_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_subscription_for_owner() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_subscription_for_owner() TO authenticated;

REVOKE ALL ON FUNCTION public.get_owner_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_subscription() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_owner_subscription() TO authenticated;

REVOKE ALL ON FUNCTION public.repair_signup_trial() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.repair_signup_trial() FROM anon;
GRANT EXECUTE ON FUNCTION public.repair_signup_trial() TO authenticated;

-- تأكيد أن المنتجات ما زالت موجودة
SELECT
  u.email,
  COALESCE(jsonb_array_length(v.data->'products'), 0) AS products,
  COALESCE(jsonb_array_length(v.data->'categories'), 0) AS categories,
  v.updated_at
FROM auth.users u
JOIN public.venues v ON v.owner_id = u.id
WHERE lower(u.email) = 's3oody16@gmail.com';
