-- ============================================================
-- ROLLBACK: 20260613180000_security_hardening_v2.sql
-- Restores post-C1–C4 state (not pre-security baseline).
-- ============================================================

BEGIN;

-- Drop v2-only objects
DROP FUNCTION IF EXISTS public.get_owner_venue_updated_at();
DROP FUNCTION IF EXISTS public.get_owner_venue();
DROP FUNCTION IF EXISTS public.get_kiosk_venue(text);
DROP FUNCTION IF EXISTS public.get_kiosk_state(text);
DROP FUNCTION IF EXISTS public.kiosk_purge_rate_limits();
DROP FUNCTION IF EXISTS public.kiosk_rate_limit_record_failure(text);
DROP FUNCTION IF EXISTS public.kiosk_rate_limit_guard(text);
DROP FUNCTION IF EXISTS public.kiosk_client_scope();
DROP FUNCTION IF EXISTS public.kiosk_normalize_code(text);
DROP FUNCTION IF EXISTS public._kiosk_gate_internal(text);

DROP TABLE IF EXISTS public.kiosk_rate_limits;

-- Restore kiosk RPCs (pre-v2, post subscription_enforcement)
CREATE OR REPLACE FUNCTION public.check_kiosk_access(p_device_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_owner_id UUID;
  v_device_status public.device_license_status;
  v_access JSONB;
BEGIN
  v_code := upper(trim(p_device_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('allowed', false, 'registered', false, 'reason', 'invalid_code');
  END IF;

  SELECT da.owner_id, da.status INTO v_owner_id, v_device_status
  FROM public.device_activations da
  WHERE upper(trim(da.code)) = v_code LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'registered', false, 'reason', 'device_not_registered');
  END IF;

  IF v_device_status <> 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'registered', true, 'reason', 'device_inactive', 'owner_id', v_owner_id);
  END IF;

  v_access := public.resolve_subscription_access(v_owner_id);

  IF NOT (v_access->>'kiosk_allowed')::boolean THEN
    RETURN jsonb_build_object(
      'allowed', false, 'registered', true,
      'reason', COALESCE(v_access->>'reason', 'subscription_' || (v_access->>'status')),
      'access', v_access, 'owner_id', v_owner_id
    );
  END IF;

  UPDATE public.device_activations SET last_seen_at = NOW() WHERE code = v_code;

  RETURN jsonb_build_object('allowed', true, 'registered', true, 'access', v_access, 'owner_id', v_owner_id);
END;
$$;

REVOKE ALL ON FUNCTION public.check_kiosk_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_kiosk_access(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_for_device(device_code text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_check JSONB; v_data JSONB;
BEGIN
  v_check := public.check_kiosk_access(device_code);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN RETURN NULL; END IF;
  SELECT v.data INTO v_data FROM public.device_activations da
  JOIN public.venues v ON v.owner_id = da.owner_id
  WHERE upper(trim(da.code)) = upper(trim(device_code)) AND da.status = 'active' LIMIT 1;
  RETURN v_data;
END;
$$;

REVOKE ALL ON FUNCTION public.get_venue_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_for_device(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_updated_at_for_device(device_code text)
RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_check JSONB; v_updated timestamptz;
BEGIN
  v_check := public.check_kiosk_access(device_code);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN RETURN NULL; END IF;
  SELECT v.updated_at INTO v_updated FROM public.device_activations da
  JOIN public.venues v ON v.owner_id = da.owner_id
  WHERE upper(trim(da.code)) = upper(trim(device_code)) AND da.status = 'active' LIMIT 1;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.get_venue_updated_at_for_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_updated_at_for_device(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_device_activated(device_code text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((public.check_kiosk_access(device_code)->>'allowed')::boolean, false);
$$;

REVOKE ALL ON FUNCTION public.is_device_activated(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_device_activated(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_device_menu_type(device_code text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_check JSONB; v_menu text;
BEGIN
  v_check := public.check_kiosk_access(device_code);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN RETURN NULL; END IF;
  SELECT da.menu_type::text INTO v_menu FROM public.device_activations da
  WHERE upper(trim(da.code)) = upper(trim(device_code)) AND da.status = 'active' LIMIT 1;
  RETURN v_menu;
END;
$$;

REVOKE ALL ON FUNCTION public.get_device_menu_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_device_menu_type(text) TO anon, authenticated;

-- Restore table grants (post-C1–C4: venues anon still revoked)
GRANT SELECT ON TABLE public.venues TO authenticated;
GRANT SELECT ON TABLE public.device_activations TO anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- Restore C1 device_activations anon RLS (no venues anon policy)
DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
CREATE POLICY "device_activations_select_anon_kiosk"
  ON public.device_activations FOR SELECT TO anon
  USING (upper(trim(code)) ~ '^QM-[A-HJ-NP-Z2-9]{4}$');

COMMIT;
