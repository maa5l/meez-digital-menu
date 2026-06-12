-- ============================================================
-- Security Hardening v2 — Production Grade (RPC-first)
-- Requires: 20260613120000_security_critical_rpc_rls.sql
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1) Rate-limit storage (no API access — SECURITY DEFINER only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kiosk_rate_limits (
  scope_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempt_count int NOT NULL DEFAULT 0,
  fail_count int NOT NULL DEFAULT 0,
  locked_until timestamptz
);

ALTER TABLE public.kiosk_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kiosk_rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.kiosk_rate_limits FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 2) Helpers — normalize, rate limit, internal gate
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kiosk_normalize_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(trim(COALESCE(p_code, '')));
$$;

CREATE OR REPLACE FUNCTION public.kiosk_client_scope()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text;
BEGIN
  BEGIN
    v_ip := nullif(trim(split_part(
      coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for',
      ',', 1
    )), '');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := coalesce(inet_client_addr()::text, 'unknown');
  END IF;

  RETURN 'ip:' || v_ip;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_client_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_client_scope() TO anon, authenticated, service_role;

-- Helper: rate-limit check for one scope (keeps guard small for SQL Editor / API limits)
CREATE OR REPLACE FUNCTION public._kiosk_rate_limit_one_scope(
  p_scope text,
  p_now timestamptz,
  p_max_attempts int,
  p_max_fails int,
  p_window interval,
  p_fail_window interval,
  p_lock_short interval,
  p_lock_long interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.kiosk_rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.kiosk_rate_limits AS k (scope_key, window_start, attempt_count, fail_count)
  VALUES (p_scope, p_now, 0, 0)
  ON CONFLICT (scope_key) DO NOTHING;

  SELECT * INTO v_row
  FROM public.kiosk_rate_limits
  WHERE scope_key = p_scope
  FOR UPDATE;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > p_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'rate_limited',
      'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_row.locked_until - p_now))::int)
    );
  END IF;

  IF v_row.window_start < p_now - p_window THEN
    UPDATE public.kiosk_rate_limits
    SET window_start = p_now, attempt_count = 0, fail_count = 0, locked_until = NULL
    WHERE scope_key = p_scope;
    v_row.attempt_count := 0;
    v_row.fail_count := 0;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    UPDATE public.kiosk_rate_limits
    SET locked_until = p_now + p_lock_short
    WHERE scope_key = p_scope;
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'rate_limited',
      'retry_after_seconds', EXTRACT(EPOCH FROM p_lock_short)::int
    );
  END IF;

  IF v_row.fail_count >= p_max_fails AND v_row.window_start >= p_now - p_fail_window THEN
    UPDATE public.kiosk_rate_limits
    SET locked_until = p_now + p_lock_long
    WHERE scope_key = p_scope;
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'rate_limited',
      'retry_after_seconds', EXTRACT(EPOCH FROM p_lock_long)::int
    );
  END IF;

  UPDATE public.kiosk_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE scope_key = p_scope;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._kiosk_rate_limit_one_scope(text, timestamptz, int, int, interval, interval, interval, interval) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_guard(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_code text := public.kiosk_normalize_code(p_code);
  v_blocked jsonb;
  v_window interval := interval '10 minutes';
  v_fail_window interval := interval '5 minutes';
  v_lock_short interval := interval '5 minutes';
  v_lock_long interval := interval '15 minutes';
BEGIN
  IF v_code = '' OR v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN NULL;
  END IF;

  v_blocked := public._kiosk_rate_limit_one_scope(
    'code:' || v_code, v_now, 120, 15, v_window, v_fail_window, v_lock_short, v_lock_long
  );
  IF v_blocked IS NOT NULL THEN
    RETURN v_blocked;
  END IF;

  v_blocked := public._kiosk_rate_limit_one_scope(
    public.kiosk_client_scope(), v_now, 400, 15, v_window, v_fail_window, v_lock_short, v_lock_long
  );
  IF v_blocked IS NOT NULL THEN
    RETURN v_blocked;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_guard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_guard(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.kiosk_rate_limit_record_failure(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_code);
  v_scope text;
BEGIN
  IF v_code = '' THEN RETURN; END IF;
  FOREACH v_scope IN ARRAY ARRAY['code:' || v_code, public.kiosk_client_scope()] LOOP
    UPDATE public.kiosk_rate_limits
    SET fail_count = fail_count + 1
    WHERE scope_key = v_scope;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_record_failure(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_record_failure(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._kiosk_gate_internal(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_device_code);
  v_owner_id uuid;
  v_device_status public.device_license_status;
  v_menu_type text;
  v_access jsonb;
  v_updated_at timestamptz;
BEGIN
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'invalid_code',
      'menu_type', NULL,
      'venue_updated_at', NULL,
      'subscription_status', NULL
    );
  END IF;

  SELECT da.owner_id, da.status, da.menu_type::text
  INTO v_owner_id, v_device_status, v_menu_type
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = v_code
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', false,
      'reason', 'device_not_registered',
      'menu_type', NULL,
      'venue_updated_at', NULL,
      'subscription_status', NULL
    );
  END IF;

  SELECT v.updated_at INTO v_updated_at
  FROM public.venues v
  WHERE v.owner_id = v_owner_id
  LIMIT 1;

  IF v_device_status <> 'active' THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object('code', v_code, 'reason', 'device_inactive')
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', 'device_inactive',
      'menu_type', v_menu_type,
      'venue_updated_at', v_updated_at,
      'subscription_status', NULL,
      '_owner_id', v_owner_id
    );
  END IF;

  v_access := public.resolve_subscription_access(v_owner_id);

  IF NOT coalesce((v_access->>'kiosk_allowed')::boolean, false) THEN
    PERFORM public.write_audit_log(
      v_owner_id,
      'access.denied',
      jsonb_build_object(
        'code', v_code,
        'reason', v_access->>'reason',
        'status', v_access->>'status'
      )
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'registered', true,
      'reason', coalesce(v_access->>'reason', 'subscription_' || (v_access->>'status')),
      'menu_type', v_menu_type,
      'venue_updated_at', v_updated_at,
      'subscription_status', v_access->>'status',
      '_owner_id', v_owner_id,
      '_access', v_access
    );
  END IF;

  UPDATE public.device_activations
  SET last_seen_at = now()
  WHERE upper(trim(code)) = v_code;

  RETURN jsonb_build_object(
    'allowed', true,
    'registered', true,
    'reason', NULL,
    'menu_type', v_menu_type,
    'venue_updated_at', v_updated_at,
    'subscription_status', v_access->>'status',
    '_owner_id', v_owner_id,
    '_access', v_access
  );
END;
$$;

REVOKE ALL ON FUNCTION public._kiosk_gate_internal(text) FROM PUBLIC;

-- ────────────────────────────────────────────────────────────
-- 3) Public kiosk RPCs
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_kiosk_state(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_gate->>'reason',
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kiosk_state(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_kiosk_venue(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_data jsonb;
  v_owner uuid;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
    RETURN NULL;
  END IF;

  v_owner := (v_gate->>'_owner_id')::uuid;
  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT v.data INTO v_data
  FROM public.venues v
  WHERE v.owner_id = v_owner
  LIMIT 1;

  RETURN v_data;
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_venue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kiosk_venue(text) TO anon, authenticated;

-- Backward-compatible wrappers
CREATE OR REPLACE FUNCTION public.check_kiosk_access(p_device_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_rate jsonb;
  v_gate jsonb;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_device_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_device_code);

  IF NOT coalesce((v_gate->>'allowed')::boolean, false) THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_device_code);
  END IF;

  IF v_uid IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', coalesce((v_gate->>'allowed')::boolean, false),
      'registered', coalesce((v_gate->>'registered')::boolean, false),
      'reason', v_gate->>'reason',
      'access', v_gate->'_access',
      'owner_id', v_gate->>'_owner_id'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_gate->>'reason',
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_kiosk_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_kiosk_access(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_for_device(device_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_kiosk_venue(device_code);
$$;

REVOKE ALL ON FUNCTION public.get_venue_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_for_device(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_updated_at_for_device(device_code text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(public.get_kiosk_state(device_code)->>'venue_updated_at', '')::timestamptz;
$$;

REVOKE ALL ON FUNCTION public.get_venue_updated_at_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_updated_at_for_device(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_device_activated(device_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((public.get_kiosk_state(device_code)->>'allowed')::boolean, false);
$$;

REVOKE ALL ON FUNCTION public.is_device_activated(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_device_activated(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(public.get_kiosk_state(device_code)->>'menu_type', '');
$$;

REVOKE ALL ON FUNCTION public.get_device_menu_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_device_menu_type(text) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4) Owner venue RPCs (dashboard — no direct table SELECT)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_owner_venue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_data jsonb;
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.data, v.updated_at INTO v_data, v_updated
  FROM public.venues v
  WHERE v.owner_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('data', v_data, 'updated_at', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_venue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_venue() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_owner_venue_updated_at()
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT v.updated_at INTO v_updated
  FROM public.venues v
  WHERE v.owner_id = v_uid
  LIMIT 1;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_venue_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_venue_updated_at() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5) RPC-only: revoke direct table access (anon + authenticated)
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_anon_kiosk_select" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
DROP POLICY IF EXISTS "venues_select_anon_kiosk" ON public.venues;
DROP POLICY IF EXISTS "venues_anon_kiosk_select" ON public.venues;

REVOKE ALL ON TABLE public.venues FROM anon, authenticated;
REVOKE ALL ON TABLE public.device_activations FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscriptions FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 6) Harden RLS policies — (select auth.uid())
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "venues_select_own" ON public.venues;
CREATE POLICY "venues_select_own"
  ON public.venues FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "device_activations_select_own" ON public.device_activations;
CREATE POLICY "device_activations_select_own"
  ON public.device_activations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own"
  ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_select_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_select_own"
  ON public.device_pairing_sessions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_insert_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_insert_own"
  ON public.device_pairing_sessions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "pairing_sessions_delete_own" ON public.device_pairing_sessions;
CREATE POLICY "pairing_sessions_delete_own"
  ON public.device_pairing_sessions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ────────────────────────────────────────────────────────────
-- 7) Purge old rate-limit rows (inline, no cron required)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kiosk_purge_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.kiosk_rate_limits
  WHERE window_start < now() - interval '24 hours'
    AND (locked_until IS NULL OR locked_until < now());
$$;

REVOKE ALL ON FUNCTION public.kiosk_purge_rate_limits() FROM PUBLIC;

SELECT public.kiosk_purge_rate_limits();

COMMIT;
