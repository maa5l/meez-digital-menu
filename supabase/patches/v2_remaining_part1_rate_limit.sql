-- Run in Supabase SQL Editor (Part 1/4) — rate limit helpers
-- If you get "syntax error at end of input", the query was truncated: run each file separately.

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

  SELECT * INTO v_row FROM public.kiosk_rate_limits WHERE scope_key = p_scope FOR UPDATE;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > p_now THEN
    RETURN jsonb_build_object(
      'allowed', false, 'registered', false, 'reason', 'rate_limited',
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
    UPDATE public.kiosk_rate_limits SET locked_until = p_now + p_lock_short WHERE scope_key = p_scope;
    RETURN jsonb_build_object(
      'allowed', false, 'registered', false, 'reason', 'rate_limited',
      'retry_after_seconds', EXTRACT(EPOCH FROM p_lock_short)::int
    );
  END IF;

  IF v_row.fail_count >= p_max_fails AND v_row.window_start >= p_now - p_fail_window THEN
    UPDATE public.kiosk_rate_limits SET locked_until = p_now + p_lock_long WHERE scope_key = p_scope;
    RETURN jsonb_build_object(
      'allowed', false, 'registered', false, 'reason', 'rate_limited',
      'retry_after_seconds', EXTRACT(EPOCH FROM p_lock_long)::int
    );
  END IF;

  UPDATE public.kiosk_rate_limits SET attempt_count = attempt_count + 1 WHERE scope_key = p_scope;
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
  IF v_blocked IS NOT NULL THEN RETURN v_blocked; END IF;

  v_blocked := public._kiosk_rate_limit_one_scope(
    public.kiosk_client_scope(), v_now, 400, 15, v_window, v_fail_window, v_lock_short, v_lock_long
  );
  IF v_blocked IS NOT NULL THEN RETURN v_blocked; END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_rate_limit_guard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_rate_limit_guard(text) TO anon, authenticated, service_role;
