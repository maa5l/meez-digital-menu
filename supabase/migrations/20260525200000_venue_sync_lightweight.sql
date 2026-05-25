-- فحص خفيف لتاريخ تحديث المنيو (لتقليل egress على أجهزة العرض)
CREATE OR REPLACE FUNCTION public.get_venue_updated_at_for_device(device_code text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.updated_at
  FROM public.device_activations da
  JOIN public.venues v ON v.owner_id = da.owner_id
  WHERE upper(trim(da.code)) = upper(trim(device_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_venue_updated_at_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_updated_at_for_device(text) TO anon, authenticated;
