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
