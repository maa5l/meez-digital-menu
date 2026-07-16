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
