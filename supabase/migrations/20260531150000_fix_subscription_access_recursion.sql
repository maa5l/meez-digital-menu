-- إصلاح stack depth limit exceeded: enforce_owner_device_limits ↔ resolve_subscription_access

CREATE OR REPLACE FUNCTION public.enforce_owner_device_limits(p_owner_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_allowed INT;
  v_active INT;
  v_deactivated INT := 0;
  r RECORD;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_allowed := GREATEST(0, COALESCE(public.effective_screen_count(s.status, s.screen_count), 0));

  SELECT COUNT(*)::INT INTO v_active
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  IF v_active <= v_allowed THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT code
    FROM public.device_activations
    WHERE owner_id = p_owner_id AND status = 'active'
    ORDER BY COALESCE(last_seen_at, activated_at) ASC NULLS FIRST, activated_at ASC
    LIMIT (v_active - v_allowed)
  LOOP
    UPDATE public.device_activations
    SET status = 'inactive'
    WHERE code = r.code;

    v_deactivated := v_deactivated + 1;

    PERFORM public.write_audit_log(
      p_owner_id,
      'device.auto_deactivated',
      jsonb_build_object('code', r.code, 'reason', 'screen_limit_exceeded')
    );
  END LOOP;

  RETURN v_deactivated;
END;
$$;

-- قطع الحلقة: refresh_subscription_state لا يستدعي enforce (يُستدعى من resolve_subscription_access)
CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_grace_days INT := 5;
  v_result public.subscription_status;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF s.status = 'trial' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at < v_now THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = v_now WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'trial'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'expired';
  END IF;

  IF s.status = 'active'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now
     AND (s.grace_ends_at IS NULL OR s.grace_ends_at < v_now)
  THEN
    UPDATE public.subscriptions
    SET status = 'grace_period', grace_ends_at = v_now + (v_grace_days || ' days')::interval, updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('grace_days', v_grace_days));
    RETURN 'grace_period';
  END IF;

  IF s.status = 'grace_period' AND s.grace_ends_at IS NOT NULL AND s.grace_ends_at < v_now THEN
    UPDATE public.subscriptions SET status = 'suspended', updated_at = v_now WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.suspended', jsonb_build_object('from', 'grace_period'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    RETURN 'suspended';
  END IF;

  IF s.status = 'past_due'
     AND s.current_period_end IS NOT NULL
     AND s.current_period_end < v_now - INTERVAL '3 days'
     AND s.grace_ends_at IS NULL
  THEN
    UPDATE public.subscriptions
    SET status = 'grace_period', grace_ends_at = v_now + (v_grace_days || ' days')::interval, updated_at = v_now
    WHERE owner_id = p_owner_id;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.grace_period_started', jsonb_build_object('from', 'past_due'));
    RETURN 'grace_period';
  END IF;

  v_result := s.status;
  RETURN v_result;
END;
$$;
