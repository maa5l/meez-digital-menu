-- إصلاح فوري لـ statement timeout عند حفظ المنيو
-- نفّذ في Supabase SQL Editor ثم أعد حفظ المنيو من اللوحة

CREATE OR REPLACE FUNCTION public.update_venue_data(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '8s'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_updated_at TIMESTAMPTZ;
  v_stored_updated_at TEXT;
  v_incoming TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_data');
  END IF;

  IF NOT pg_try_advisory_xact_lock(872341, hashtext(v_uid::text)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'busy');
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  IF NOT COALESCE((v_access->>'dashboard_edit_allowed')::boolean, false) THEN
    PERFORM public.write_audit_log(
      v_uid,
      'venue.update_denied',
      jsonb_build_object('reason', v_access->>'reason', 'status', v_access->>'status')
    );
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_edit_blocked', 'access', v_access);
  END IF;

  v_incoming := NULLIF(p_data->>'updatedAt', '');

  SELECT v.updated_at, NULLIF(v.data->>'updatedAt', '')
  INTO v_updated_at, v_stored_updated_at
  FROM public.venues v
  WHERE v.owner_id = v_uid;

  IF FOUND THEN
    IF v_incoming IS NOT NULL
       AND v_stored_updated_at IS NOT NULL
       AND v_incoming < v_stored_updated_at THEN
      RETURN jsonb_build_object(
        'ok', true,
        'updated_at', v_updated_at,
        'skipped', 'stale'
      );
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

REVOKE ALL ON FUNCTION public.update_venue_data(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_venue_data(JSONB) TO authenticated;
