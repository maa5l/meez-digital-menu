-- فضّل المنيو التي فيها صور على النسخة المجرّدة (ضغط الجوال)
-- لا يحذف بيانات — يعدّل منطق update_venue_data فقط
-- نفّذ دفعة واحدة ثم أعد استعادة النسخة الاحتياطية

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
  v_incoming_images INT := 0;
  v_existing_images INT := 0;
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

  SELECT COUNT(*)::int INTO v_incoming_images
  FROM jsonb_array_elements(COALESCE(p_data->'products', '[]'::jsonb)) AS p(elem)
  WHERE COALESCE(NULLIF(elem->>'imageLandscape', ''), NULLIF(elem->>'imagePortrait', ''), NULLIF(elem->>'image', ''))
        LIKE 'data:image%';

  SELECT v.updated_at, v.data, NULLIF(v.data->>'updatedAt', '')
  INTO v_updated_at, v_existing_data, v_stored_updated_at
  FROM public.venues v
  WHERE v.owner_id = v_uid;

  IF FOUND THEN
    v_existing_empty :=
      COALESCE(jsonb_typeof(v_existing_data->'products') <> 'array' OR jsonb_array_length(v_existing_data->'products') = 0, true)
      AND COALESCE(jsonb_typeof(v_existing_data->'categories') <> 'array' OR jsonb_array_length(v_existing_data->'categories') = 0, true)
      AND COALESCE(jsonb_typeof(v_existing_data->'crops') <> 'array' OR jsonb_array_length(v_existing_data->'crops') = 0, true);

    SELECT COUNT(*)::int INTO v_existing_images
    FROM jsonb_array_elements(COALESCE(v_existing_data->'products', '[]'::jsonb)) AS p(elem)
    WHERE COALESCE(NULLIF(elem->>'imageLandscape', ''), NULLIF(elem->>'imagePortrait', ''), NULLIF(elem->>'image', ''))
          LIKE 'data:image%';

    -- لا ترفض محتوى بصور أمام نسخة أحدث بلا صور
    IF v_incoming IS NOT NULL
       AND v_stored_updated_at IS NOT NULL
       AND v_incoming < v_stored_updated_at
       AND NOT (v_incoming_has_content AND v_existing_empty)
       AND NOT (v_incoming_images > 0 AND v_existing_images = 0) THEN
      RETURN jsonb_build_object('ok', true, 'updated_at', v_updated_at, 'skipped', 'stale');
    END IF;

    -- لا تسمح لمحتوى فارغ أن يكتب فوق منيو فيها منتجات
    IF (NOT v_incoming_has_content) AND (NOT v_existing_empty) THEN
      RETURN jsonb_build_object('ok', true, 'updated_at', v_updated_at, 'skipped', 'empty_guard');
    END IF;

    -- لا تسمح لنسخة بلا صور أن تمسح صور موجودة
    IF v_incoming_images = 0 AND v_existing_images > 0 THEN
      RETURN jsonb_build_object('ok', true, 'updated_at', v_updated_at, 'skipped', 'images_guard');
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
REVOKE ALL ON FUNCTION public.update_venue_data(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_venue_data(JSONB) TO authenticated;

SELECT
  u.email,
  COALESCE(jsonb_array_length(v.data->'products'), 0) AS products,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(COALESCE(v.data->'products', '[]'::jsonb)) AS p(elem)
    WHERE COALESCE(NULLIF(elem->>'imageLandscape', ''), NULLIF(elem->>'imagePortrait', ''), NULLIF(elem->>'image', ''))
          LIKE 'data:image%'
  ) AS products_with_images,
  v.updated_at
FROM auth.users u
JOIN public.venues v ON v.owner_id = u.id
WHERE lower(u.email) = 's3oody16@gmail.com';
