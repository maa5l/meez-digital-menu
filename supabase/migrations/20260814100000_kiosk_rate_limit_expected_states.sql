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
