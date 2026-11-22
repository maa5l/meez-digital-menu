-- إصلاح فوري: السحابة الفارغة كانت ترفض منتجات البي سي كـ «قديمة»
-- لا يحذف بيانات — يعدّل دالة الحفظ فقط
-- نفّذ دفعة واحدة في SQL Editor ثم أعد فتح /dashboard من البي سي

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
  v_stored_data JSONB;
  v_stored_empty BOOLEAN;
  v_incoming_has_content BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_data');
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

  IF NOT pg_try_advisory_xact_lock(872341, hashtext(v_uid::text)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'busy');
  END IF;

  v_incoming := NULLIF(p_data->>'updatedAt', '');
  v_incoming_has_content :=
    COALESCE(jsonb_array_length(p_data->'products'), 0) > 0
    OR COALESCE(jsonb_array_length(p_data->'categories'), 0) > 0
    OR COALESCE(jsonb_array_length(p_data->'crops'), 0) > 0
    OR COALESCE(jsonb_array_length(p_data->'devices'), 0) > 0;

  SELECT v.updated_at, NULLIF(v.data->>'updatedAt', ''), v.data
  INTO v_updated_at, v_stored_updated_at, v_stored_data
  FROM public.venues v
  WHERE v.owner_id = v_uid;

  IF FOUND THEN
    v_stored_empty :=
      v_stored_data IS NULL
      OR (
        COALESCE(jsonb_array_length(v_stored_data->'products'), 0) = 0
        AND COALESCE(jsonb_array_length(v_stored_data->'categories'), 0) = 0
        AND COALESCE(jsonb_array_length(v_stored_data->'crops'), 0) = 0
        AND COALESCE(jsonb_array_length(v_stored_data->'devices'), 0) = 0
      );

    IF v_incoming IS NOT NULL
       AND v_stored_updated_at IS NOT NULL
       AND v_incoming < v_stored_updated_at
       AND NOT (v_incoming_has_content AND v_stored_empty) THEN
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

-- تحقق: عدد المنتجات في السحابة الآن
SELECT
  p.email,
  jsonb_array_length(COALESCE(v.data->'products', '[]'::jsonb)) AS products,
  jsonb_array_length(COALESCE(v.data->'categories', '[]'::jsonb)) AS categories,
  v.updated_at
FROM public.venues v
LEFT JOIN public.profiles p ON p.id = v.owner_id
WHERE lower(COALESCE(p.email, '')) LIKE '%s3oody%'
   OR lower(COALESCE(p.venue_name, '')) LIKE '%لينور%'
ORDER BY v.updated_at DESC NULLS LAST;
