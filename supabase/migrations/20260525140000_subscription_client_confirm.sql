-- تأكيد الدفع من الواجهة (بدون خادم Express) — للمستخدم المسجّل فقط

CREATE OR REPLACE FUNCTION public.confirm_subscription_payment(
  p_screen_count INT,
  p_billing_cycle TEXT,
  p_card_last4 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cycle public.billing_cycle;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_screen_count IS NULL OR p_screen_count < 1 OR p_screen_count > 50 THEN
    RAISE EXCEPTION 'invalid_screen_count';
  END IF;

  v_cycle := CASE lower(trim(p_billing_cycle))
    WHEN 'yearly' THEN 'yearly'::public.billing_cycle
    ELSE 'monthly'::public.billing_cycle
  END;

  RETURN public.process_billing_webhook(
    v_uid,
    'payment.success',
    jsonb_build_object(
      'screen_count', p_screen_count,
      'billing_cycle', v_cycle::text,
      'card_last4', NULLIF(trim(p_card_last4), ''),
      'client_confirm', true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_subscription_payment(INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_subscription_payment(INT, TEXT, TEXT) TO authenticated;
