-- إزالة قفل rate-limit للكiosk بالكامل (لا حظر 5/15 دقيقة)

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_guard(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- معطّل عمدًا: لا قفل على أجهزة العرض
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_record_failure(p_code text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- معطّل عمدًا: لا تسجيل فشل ولا قفل
  RETURN;
END;
$$;

-- فك أي قفل قائم فورًا
UPDATE public.kiosk_rate_limits
SET locked_until = NULL,
    attempt_count = 0,
    fail_count = 0,
    window_start = now();

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_guard(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kiosk_rate_limit_record_failure(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_guard(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_record_failure(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
