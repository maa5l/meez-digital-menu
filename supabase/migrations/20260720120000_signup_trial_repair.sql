-- إصلاح تجربة 7 أيام للحسابات الجديدة (خلال 24 ساعة من الإنشاء)
-- يُستدعى من التطبيق بعد التسجيل إذا فشل الـ trigger

CREATE OR REPLACE FUNCTION public.repair_signup_trial()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_created TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT u.created_at INTO v_created
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_created IS NULL OR v_created < v_now - INTERVAL '24 hours' THEN
    RETURN;
  END IF;

  INSERT INTO public.subscriptions (
    owner_id,
    status,
    screen_count,
    device_limit,
    trial_started_at,
    trial_ends_at,
    manual_activation
  )
  VALUES (
    v_uid,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    status = 'trial',
    screen_count = 1,
    device_limit = 1,
    trial_started_at = v_now,
    trial_ends_at = v_now + INTERVAL '7 days',
    updated_at = v_now
  WHERE public.subscriptions.manual_activation = false
    AND public.subscriptions.status IN ('expired', 'canceled', 'suspended');
END;
$$;

REVOKE ALL ON FUNCTION public.repair_signup_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_signup_trial() TO authenticated;
