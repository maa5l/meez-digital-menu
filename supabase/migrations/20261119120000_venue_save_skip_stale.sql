-- حفظ المنيو: تجاهل النسخة الأقدم حتى لا يكتب طلب معلّق فوق بيانات أحدث،
-- وحدّ زمني حتى لا يبقى الطلب عالقاً على الاستضافة.

CREATE OR REPLACE FUNCTION public.update_venue_data(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '20s'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_row public.venues%ROWTYPE;
  v_incoming TEXT;
  v_stored TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_data');
  END IF;

  SELECT * INTO v_row FROM public.venues WHERE owner_id = v_uid;

  IF FOUND THEN
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
    v_stored := NULLIF(v_row.data->>'updatedAt', '');
    IF v_incoming IS NOT NULL AND v_stored IS NOT NULL AND v_incoming < v_stored THEN
      RETURN jsonb_build_object(
        'ok', true,
        'updated_at', v_row.updated_at,
        'skipped', 'stale'
      );
    END IF;

    UPDATE public.venues
    SET data = p_data, updated_at = NOW()
    WHERE owner_id = v_uid;
  ELSE
    INSERT INTO public.venues (owner_id, data)
    VALUES (v_uid, p_data);
  END IF;

  PERFORM public.write_audit_log(
    v_uid,
    'venue.updated',
    jsonb_build_object('bytes', pg_column_size(p_data))
  );

  RETURN jsonb_build_object('ok', true, 'updated_at', NOW());
END;
$$;
