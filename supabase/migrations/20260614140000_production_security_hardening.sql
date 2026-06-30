-- Production security hardening: indexes, RPC grants, audit on trial start
BEGIN;

-- Performance indexes for admin dashboards
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_trial_ends_at_idx ON public.subscriptions (trial_ends_at)
  WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS subscriptions_subscription_ends_at_idx
  ON public.subscriptions (subscription_ends_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS profiles_last_activity_idx ON public.profiles (last_activity_at DESC NULLS LAST);

-- Ensure sensitive admin helpers are not callable by anon
REVOKE ALL ON FUNCTION public.get_admin_role() FROM anon;
REVOKE ALL ON FUNCTION public.admin_require_role(public.admin_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_admin_log(UUID, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_subscription_history(UUID, public.subscriptions, public.subscriptions, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Block direct table writes on admin/subscription audit tables (defense in depth)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.admin_users FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.admin_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscription_history FROM anon, authenticated;

-- Log trial start when subscription row is first created
CREATE OR REPLACE FUNCTION public.ensure_subscription_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
  v_new_owner UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
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
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING owner_id INTO v_new_owner;

  IF v_new_owner IS NOT NULL THEN
    PERFORM public.write_audit_log(
      v_uid,
      'subscription.trial_started',
      jsonb_build_object('trial_ends_at', v_now + INTERVAL '7 days')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_subscription_for_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_subscription_for_owner() TO authenticated;

COMMIT;
