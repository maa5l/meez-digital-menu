-- معاينة المنيو من لوحة التحكم: للمالك المسجّل دخوله دائماً (بغضّ النظر عن حالة الاشتراك)
CREATE OR REPLACE FUNCTION public.get_dashboard_preview_venue()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.data INTO v_data FROM public.venues v WHERE v.owner_id = v_uid LIMIT 1;

  PERFORM public.write_audit_log(
    v_uid,
    'preview.menu_access',
    jsonb_build_object('has_data', v_data IS NOT NULL)
  );

  RETURN v_data;
END;
$$;
