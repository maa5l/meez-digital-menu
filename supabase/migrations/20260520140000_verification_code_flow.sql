-- كود تحقق يُنشأ من لوحة التحكم ويُدخل على الجهاز (بدون QR)

CREATE OR REPLACE FUNCTION public.create_device_verification_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  INSERT INTO public.device_pairing_sessions (owner_id, code)
  VALUES (auth.uid(), v_code)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_device_verification_code(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_pairing_sessions
    WHERE upper(trim(code)) = upper(trim(p_code))
      AND expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.create_device_verification_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_device_verification_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_device_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_device_verification_code(text) TO anon, authenticated;
