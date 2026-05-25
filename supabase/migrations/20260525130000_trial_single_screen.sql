-- الفترة التجريبية: شاشة واحدة فقط (تطبيق على مستوى resolve)

CREATE OR REPLACE FUNCTION public.effective_screen_count(
  p_status public.subscription_status,
  p_screen_count INT
)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'trial' THEN 1
    ELSE GREATEST(0, p_screen_count)
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_subscription_access(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_status public.subscription_status;
  v_active_devices INT;
  v_effective_screens INT;
  v_kiosk BOOLEAN;
  v_edit BOOLEAN;
  v_add_devices BOOLEAN;
  v_banner TEXT;
BEGIN
  PERFORM public.refresh_subscription_state(p_owner_id);

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'kiosk_allowed', false,
      'dashboard_edit_allowed', false,
      'can_add_devices', false,
      'status', 'expired',
      'reason', 'no_subscription',
      'screen_count', 0,
      'licensed_screen_count', 0,
      'active_device_count', 0,
      'banner', 'error'
    );
  END IF;

  v_status := s.status;
  v_effective_screens := public.effective_screen_count(v_status, s.screen_count);

  -- تصحيح سجل trial إذا كان screen_count > 1
  IF v_status = 'trial' AND s.screen_count <> 1 THEN
    UPDATE public.subscriptions
    SET screen_count = 1, updated_at = NOW()
    WHERE owner_id = p_owner_id;
    s.screen_count := 1;
    v_effective_screens := 1;
  END IF;

  SELECT COUNT(*)::INT INTO v_active_devices
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  v_kiosk := v_status IN ('active', 'trial', 'past_due', 'grace_period');
  v_edit := v_status IN ('active', 'trial');
  v_add_devices := v_status IN ('active', 'trial') AND v_active_devices < v_effective_screens;

  v_banner := CASE v_status
    WHEN 'past_due' THEN 'warning'
    WHEN 'grace_period' THEN 'grace'
    WHEN 'suspended' THEN 'suspended'
    WHEN 'expired' THEN 'expired'
    WHEN 'canceled' THEN 'canceled'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'allowed', v_status IN ('active', 'trial', 'past_due', 'grace_period'),
    'kiosk_allowed', v_kiosk,
    'dashboard_edit_allowed', v_edit,
    'can_add_devices', v_add_devices,
    'status', v_status::text,
    'reason', CASE WHEN v_kiosk THEN NULL ELSE 'subscription_' || v_status::text END,
    'screen_count', v_effective_screens,
    'licensed_screen_count', s.screen_count,
    'active_device_count', v_active_devices,
    'grace_ends_at', s.grace_ends_at,
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'billing_cycle', s.billing_cycle::text,
    'banner', v_banner
  );
END;
$$;

-- تأكيد trial = شاشة واحدة عند الإنشاء
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    owner_id, status, screen_count, trial_ends_at, current_period_start, current_period_end
  )
  VALUES (
    NEW.id,
    'trial',
    1,
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE public.subscriptions
SET screen_count = 1, updated_at = NOW()
WHERE status = 'trial' AND screen_count <> 1;
