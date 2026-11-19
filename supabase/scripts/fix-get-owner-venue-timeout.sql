-- تسريع قراءة المنيو بعد الدخول (بدون حذف أي بيانات)
-- نفّذ في SQL Editor

CREATE OR REPLACE FUNCTION public.get_owner_venue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_data jsonb;
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
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

REVOKE ALL ON FUNCTION public.get_owner_venue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_venue() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_owner_venue_updated_at()
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.updated_at INTO v_updated
  FROM public.venues v
  WHERE v.owner_id = v_uid
  LIMIT 1;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_venue_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_venue_updated_at() TO authenticated;
