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
