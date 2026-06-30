-- ============================================================
-- Manual subscription + platform admin (production SaaS)
-- Replaces online billing with 7-day trial + admin activation
-- ============================================================

BEGIN;

-- ── 1) Admin roles ──────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'support');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'admin',
  full_name TEXT,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_users_role_idx ON public.admin_users (role);
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users (email);

DROP TRIGGER IF EXISTS admin_users_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

-- ── 2) Admin logs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_users (user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_logs_admin_created_idx
  ON public.admin_logs (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_target_idx
  ON public.admin_logs (target_owner_id, created_at DESC);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_logs FROM anon, authenticated;

-- ── 3) Subscription history ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  previous_status public.subscription_status,
  new_status public.subscription_status NOT NULL,
  previous_device_limit INT,
  new_device_limit INT,
  previous_subscription_ends_at TIMESTAMPTZ,
  new_subscription_ends_at TIMESTAMPTZ,
  changed_by UUID,
  change_source TEXT NOT NULL DEFAULT 'system',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_history_owner_idx
  ON public.subscription_history (owner_id, created_at DESC);

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscription_history FROM PUBLIC;
REVOKE ALL ON TABLE public.subscription_history FROM anon, authenticated;

-- ── 4) Subscription + profile columns ───────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES public.admin_users (user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_activation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS device_limit INT;

UPDATE public.subscriptions
SET
  trial_started_at = COALESCE(trial_started_at, created_at),
  subscription_started_at = COALESCE(subscription_started_at, current_period_start),
  subscription_ends_at = COALESCE(subscription_ends_at, current_period_end),
  device_limit = COALESCE(device_limit, screen_count, 1)
WHERE trial_started_at IS NULL
   OR device_limit IS NULL
   OR subscription_ends_at IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- ── 5) Helpers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.subscription_device_limit(p_sub public.subscriptions)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(0, COALESCE(p_sub.device_limit, p_sub.screen_count, 0));
$$;

CREATE OR REPLACE FUNCTION public.effective_screen_count(
  p_status public.subscription_status,
  p_screen_count INT
)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_status = 'trial' THEN 1
    ELSE GREATEST(0, COALESCE(p_screen_count, 0))
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_subscription_history(
  p_owner_id UUID,
  p_previous public.subscriptions,
  p_new public.subscriptions,
  p_changed_by UUID,
  p_source TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.subscription_history (
    owner_id,
    previous_status,
    new_status,
    previous_device_limit,
    new_device_limit,
    previous_subscription_ends_at,
    new_subscription_ends_at,
    changed_by,
    change_source,
    notes
  ) VALUES (
    p_owner_id,
    p_previous.status,
    p_new.status,
    public.subscription_device_limit(p_previous),
    public.subscription_device_limit(p_new),
    p_previous.subscription_ends_at,
    p_new.subscription_ends_at,
    p_changed_by,
    p_source,
    p_notes
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_subscription_history(UUID, public.subscriptions, public.subscriptions, UUID, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.touch_owner_activity(p_owner_id UUID DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_owner_id IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
  SET last_activity_at = NOW(), updated_at = NOW()
  WHERE id = p_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_owner_activity(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_owner_activity(UUID) TO authenticated;

-- ── 6) Admin auth helpers ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS public.admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.admin_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_role_rank(p_role public.admin_role)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'support' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'super_admin' THEN 3
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_require_role(p_min public.admin_role)
RETURNS public.admin_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.admin_role;
BEGIN
  v_role := public.get_admin_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'admin_forbidden';
  END IF;
  IF public.admin_role_rank(v_role) < public.admin_role_rank(p_min) THEN
    RAISE EXCEPTION 'admin_insufficient_role';
  END IF;
  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_require_role(public.admin_role) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.write_admin_log(
  p_admin_id UUID,
  p_action TEXT,
  p_target_owner_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, target_owner_id, metadata)
  VALUES (p_admin_id, p_action, p_target_owner_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_admin_log(UUID, TEXT, UUID, JSONB) FROM PUBLIC;

-- ── 7) Trial = 7 days, strict state machine ─────────────────

CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  s_prev public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  s_prev := s;

  -- Trial expired
  IF s.status = 'trial'
     AND s.trial_ends_at IS NOT NULL
     AND s.trial_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id
    RETURNING * INTO s;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'trial'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    PERFORM public.record_subscription_history(p_owner_id, s_prev, s, NULL, 'system', 'trial_expired');
    RETURN 'expired';
  END IF;

  -- Active subscription ended
  IF s.status = 'active'
     AND s.subscription_ends_at IS NOT NULL
     AND s.subscription_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id
    RETURNING * INTO s;
    PERFORM public.write_audit_log(p_owner_id, 'subscription.expired', jsonb_build_object('from', 'active'));
    PERFORM public.deactivate_all_devices_for_owner(p_owner_id);
    PERFORM public.record_subscription_history(p_owner_id, s_prev, s, NULL, 'system', 'subscription_ended');
    RETURN 'expired';
  END IF;

  RETURN s.status;
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
  v_screen_count INT;
  v_allowed BOOLEAN;
BEGIN
  PERFORM public.refresh_subscription_state(p_owner_id);

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'kiosk_allowed', false,
      'dashboard_allowed', false,
      'dashboard_edit_allowed', false,
      'can_add_devices', false,
      'status', 'expired',
      'reason', 'no_subscription',
      'screen_count', 0,
      'active_device_count', 0,
      'device_limit', 0,
      'banner', 'expired'
    );
  END IF;

  v_status := s.status;
  v_screen_count := public.effective_screen_count(v_status, public.subscription_device_limit(s));

  PERFORM public.enforce_owner_device_limits(p_owner_id);

  SELECT COUNT(*)::INT INTO v_active_devices
  FROM public.device_activations
  WHERE owner_id = p_owner_id AND status = 'active';

  v_allowed := v_status IN ('trial', 'active');

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'kiosk_allowed', v_allowed,
    'dashboard_allowed', v_allowed,
    'dashboard_edit_allowed', v_allowed,
    'can_add_devices', v_allowed AND v_active_devices < v_screen_count,
    'status', v_status::text,
    'reason', CASE WHEN v_allowed THEN NULL ELSE 'subscription_' || v_status::text END,
    'screen_count', v_screen_count,
    'device_limit', public.subscription_device_limit(s),
    'active_device_count', v_active_devices,
    'trial_started_at', s.trial_started_at,
    'trial_ends_at', s.trial_ends_at,
    'subscription_started_at', s.subscription_started_at,
    'subscription_ends_at', s.subscription_ends_at,
    'manual_activation', s.manual_activation,
    'banner', CASE v_status
      WHEN 'trial' THEN 'trial'
      WHEN 'active' THEN NULL
      WHEN 'suspended' THEN 'suspended'
      WHEN 'expired' THEN 'expired'
      WHEN 'canceled' THEN 'canceled'
      ELSE 'error'
    END
  );
END;
$$;

-- ── 8) Create subscription on signup (7-day trial) ──────────

CREATE OR REPLACE FUNCTION public.ensure_subscription_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
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
  ON CONFLICT (owner_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
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
    NEW.id,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 9) Owner subscription fetch ─────────────────────────────

CREATE OR REPLACE FUNCTION public.get_owner_subscription()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  s public.subscriptions%ROWTYPE;
  v_access JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.touch_owner_activity(v_uid);
  PERFORM public.ensure_subscription_for_owner();

  SELECT * INTO s FROM public.subscriptions WHERE owner_id = v_uid;
  v_access := public.resolve_subscription_access(v_uid);

  RETURN jsonb_build_object(
    'owner_id', v_uid,
    'status', s.status::text,
    'screen_count', public.subscription_device_limit(s),
    'device_limit', public.subscription_device_limit(s),
    'trial_started_at', s.trial_started_at,
    'trial_ends_at', s.trial_ends_at,
    'subscription_started_at', s.subscription_started_at,
    'subscription_ends_at', s.subscription_ends_at,
    'manual_activation', s.manual_activation,
    'activated_at', s.activated_at,
    'notes', s.notes,
    'access', v_access
  );
END;
$$;

-- ── 10) Block dashboard preview when expired ─────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_preview_venue()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_access JSONB;
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  IF NOT COALESCE((v_access->>'dashboard_allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_blocked', 'access', v_access);
  END IF;

  SELECT data INTO v_data FROM public.venues WHERE owner_id = v_uid;
  RETURN jsonb_build_object('ok', true, 'data', COALESCE(v_data, '{}'::jsonb), 'access', v_access);
END;
$$;

-- ── 11) Remove billing webhooks ─────────────────────────────

DROP FUNCTION IF EXISTS public.confirm_subscription_payment(INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_billing_webhook(UUID, TEXT, JSONB);

-- ── 12) Admin: profile check ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_admin_profile()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.admin_role;
  au public.admin_users%ROWTYPE;
BEGIN
  v_role := public.get_admin_role();
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('is_admin', false);
  END IF;

  SELECT * INTO au FROM public.admin_users WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'is_admin', true,
    'user_id', au.user_id,
    'role', au.role::text,
    'email', au.email,
    'full_name', au.full_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_admin_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_admin_profile() TO authenticated;

-- ── 13) Admin dashboard stats ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  PERFORM public.admin_require_role('support');

  RETURN jsonb_build_object(
    'total_customers', (SELECT COUNT(*)::int FROM public.profiles),
    'active_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'active'),
    'trial_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'trial'),
    'expired_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'expired'),
    'suspended_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'suspended'),
    'total_devices', (SELECT COUNT(*)::int FROM public.device_activations WHERE status = 'active'),
    'new_registrations_7d', (
      SELECT COUNT(*)::int FROM public.profiles
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT al.action, al.metadata, al.created_at, al.owner_id
        FROM public.audit_logs al
        ORDER BY al.created_at DESC
        LIMIT 20
      ) t
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;

-- ── 14) Admin list customers ────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
  v_total INT;
BEGIN
  PERFORM public.admin_require_role('support');

  SELECT COUNT(*)::int INTO v_total
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.owner_id = p.id
  WHERE (p_search IS NULL OR p_search = '' OR
         p.email ILIKE '%' || p_search || '%' OR
         COALESCE(p.full_name, '') ILIKE '%' || p_search || '%' OR
         COALESCE(p.venue_name, '') ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status);

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.created_at AS registration_date,
      p.last_activity_at,
      u.last_sign_in_at AS last_login,
      s.status::text AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      public.subscription_device_limit(s) AS device_limit,
      s.manual_activation,
      s.notes,
      p.internal_notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      (SELECT COALESCE(jsonb_array_length(v.data->'products'), 0)::int
       FROM public.venues v WHERE v.owner_id = p.id) AS product_count
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE (p_search IS NULL OR p_search = '' OR
           p.email ILIKE '%' || p_search || '%' OR
           COALESCE(p.full_name, '') ILIKE '%' || p_search || '%' OR
           COALESCE(p.venue_name, '') ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status)
    ORDER BY p.created_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200))
    OFFSET GREATEST(0, p_offset)
  ) t;

  RETURN jsonb_build_object('total', v_total, 'customers', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) TO authenticated;

-- ── 15) Admin customer detail ───────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_customer(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer JSONB;
  v_history JSONB;
BEGIN
  PERFORM public.admin_require_role('support');

  SELECT row_to_json(t)::jsonb INTO v_customer
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.role,
      p.created_at AS registration_date,
      p.last_activity_at,
      p.internal_notes,
      u.last_sign_in_at AS last_login,
      s.status::text AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      public.subscription_device_limit(s) AS device_limit,
      s.manual_activation,
      s.activated_by,
      s.activated_at,
      s.notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      (SELECT COALESCE(jsonb_array_length(v.data->'products'), 0)::int
       FROM public.venues v WHERE v.owner_id = p.id) AS product_count,
      public.resolve_subscription_access(p.id) AS access
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_owner_id
  ) t;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM public.subscription_history
    WHERE owner_id = p_owner_id
    ORDER BY created_at DESC
    LIMIT 50
  ) h;

  RETURN jsonb_build_object('ok', true, 'customer', v_customer, 'history', v_history);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_customer(UUID) TO authenticated;

-- ── 16) Admin mutate subscription ───────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  p_owner_id UUID,
  p_action TEXT,
  p_device_limit INT DEFAULT NULL,
  p_subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_role public.admin_role;
  s_prev public.subscriptions%ROWTYPE;
  s_new public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_role := public.admin_require_role('admin');

  SELECT * INTO s_prev FROM public.subscriptions WHERE owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_not_found');
  END IF;

  IF p_internal_notes IS NOT NULL THEN
    UPDATE public.profiles SET internal_notes = p_internal_notes WHERE id = p_owner_id;
  END IF;

  CASE p_action
    WHEN 'activate' THEN
      UPDATE public.subscriptions SET
        status = 'active',
        manual_activation = true,
        activated_by = v_admin,
        activated_at = v_now,
        subscription_started_at = COALESCE(subscription_started_at, v_now),
        subscription_ends_at = COALESCE(p_subscription_ends_at, subscription_ends_at, v_now + INTERVAL '30 days'),
        device_limit = COALESCE(p_device_limit, device_limit, screen_count, 1),
        screen_count = COALESCE(p_device_limit, device_limit, screen_count, 1),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'suspend' THEN
      UPDATE public.subscriptions SET
        status = 'suspended',
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;
      PERFORM public.deactivate_all_devices_for_owner(p_owner_id);

    WHEN 'disable' THEN
      UPDATE public.subscriptions SET
        status = 'canceled',
        canceled_at = v_now,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;
      PERFORM public.deactivate_all_devices_for_owner(p_owner_id);

    WHEN 'extend' THEN
      IF p_subscription_ends_at IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'subscription_ends_at_required');
      END IF;
      UPDATE public.subscriptions SET
        status = CASE WHEN status IN ('expired', 'suspended', 'canceled') THEN 'active' ELSE status END,
        subscription_ends_at = p_subscription_ends_at,
        manual_activation = true,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'reset_trial' THEN
      UPDATE public.subscriptions SET
        status = 'trial',
        trial_started_at = v_now,
        trial_ends_at = v_now + INTERVAL '7 days',
        manual_activation = false,
        activated_by = NULL,
        activated_at = NULL,
        subscription_started_at = NULL,
        subscription_ends_at = NULL,
        device_limit = COALESCE(p_device_limit, 1),
        screen_count = COALESCE(p_device_limit, 1),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'set_device_limit' THEN
      IF p_device_limit IS NULL OR p_device_limit < 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_device_limit');
      END IF;
      UPDATE public.subscriptions SET
        device_limit = p_device_limit,
        screen_count = p_device_limit,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;
      PERFORM public.enforce_owner_device_limits(p_owner_id);

    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'unknown_action');
  END CASE;

  PERFORM public.record_subscription_history(
    p_owner_id, s_prev, s_new, v_admin, 'admin:' || p_action, p_notes
  );
  PERFORM public.write_admin_log(
    v_admin,
    'subscription.' || p_action,
    p_owner_id,
    jsonb_build_object(
      'previous_status', s_prev.status,
      'new_status', s_new.status,
      'device_limit', public.subscription_device_limit(s_new)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'customer', (public.admin_get_customer(p_owner_id)->'customer'),
    'access', public.resolve_subscription_access(p_owner_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

COMMIT;
