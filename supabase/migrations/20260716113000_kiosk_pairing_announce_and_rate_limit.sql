-- Kiosk pairing: الجهاز يعلن الرمز أولاً — التفعيل من لوحة التحكم يتطلب ذلك
-- Fix: لا تُحسب حالة «بانتظار التفعيل» كفشل في rate limit (كانت تسبب «محاولات كثيرة»)

BEGIN;

CREATE TABLE IF NOT EXISTS public.kiosk_pairing_announcements (
  code text PRIMARY KEY,
  announced_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  CONSTRAINT kiosk_pairing_announcements_code_format CHECK (code ~ '^QM-[A-HJ-NP-Z2-9]{4}$')
);

CREATE INDEX IF NOT EXISTS kiosk_pairing_announcements_expires_idx
  ON public.kiosk_pairing_announcements (expires_at);

ALTER TABLE public.kiosk_pairing_announcements ENABLE ROW LEVEL SECURITY;

-- لا SELECT مباشر — الوصول عبر RPC فقط
REVOKE ALL ON TABLE public.kiosk_pairing_announcements FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.announce_kiosk_pairing_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.kiosk_normalize_code(p_code);
BEGIN
  IF v_code = '' OR v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  INSERT INTO public.kiosk_pairing_announcements (code, announced_at, expires_at)
  VALUES (v_code, now(), now() + interval '30 minutes')
  ON CONFLICT (code) DO UPDATE SET
    announced_at = excluded.announced_at,
    expires_at = excluded.expires_at;

  RETURN jsonb_build_object('ok', true, 'code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_kiosk_pairing_announced(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kiosk_pairing_announcements kpa
    WHERE kpa.code = public.kiosk_normalize_code(p_code)
      AND kpa.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.announce_kiosk_pairing_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_kiosk_pairing_announced(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.announce_kiosk_pairing_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_kiosk_pairing_announced(text) TO authenticated;

-- لا تسجّل فشلاً عند انتظار التفعيل (polling طبيعي من التطبيق)
CREATE OR REPLACE FUNCTION public.get_kiosk_state(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate jsonb;
  v_gate jsonb;
  v_reason text;
BEGIN
  v_rate := public.kiosk_rate_limit_guard(p_code);
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  v_gate := public._kiosk_gate_internal(p_code);
  v_reason := v_gate->>'reason';

  IF NOT coalesce((v_gate->>'allowed')::boolean, false)
     AND v_reason IS DISTINCT FROM 'device_not_registered' THEN
    PERFORM public.kiosk_rate_limit_record_failure(p_code);
  END IF;

  RETURN jsonb_build_object(
    'allowed', coalesce((v_gate->>'allowed')::boolean, false),
    'registered', coalesce((v_gate->>'registered')::boolean, false),
    'reason', v_reason,
    'menu_type', v_gate->>'menu_type',
    'venue_updated_at', v_gate->>'venue_updated_at',
    'subscription_status', v_gate->>'subscription_status'
  );
END;
$$;

-- تفعيل جديد: يتطلب إعلان الرمز من الجهاز الفعلي
CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL,
  p_app_env TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev BOOLEAN := public.resolve_app_is_development(p_app_env);
  v_uid UUID;
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
  v_announced BOOLEAN;
BEGIN
  IF v_dev THEN
    v_uid := public.resolve_dev_owner_id();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'dev_mode', true,
        'error', 'no_dev_owner'
      );
    END IF;
  ELSE
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'not_authenticated'
      );
    END IF;
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_code'
    );
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    IF NOT v_dev THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'code_already_claimed'
    );
  END IF;

  IF v_existing_owner IS NULL AND NOT v_dev THEN
    SELECT public.is_kiosk_pairing_announced(v_code) INTO v_announced;

    IF NOT coalesce(v_announced, false) THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'device_not_announced')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'device_not_announced'
      );
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND upper(trim(dps.code)) = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'verification_code_invalid'
      );
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF NOT v_dev THEN
    IF v_existing_owner IS NULL THEN
      IF NOT (v_access->>'can_add_devices')::boolean THEN
        IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
          PERFORM public.write_audit_log(
            v_uid,
            'device.register_denied',
            jsonb_build_object('code', v_code, 'reason', 'screen_limit')
          );
          RETURN jsonb_build_object(
            'ok', false,
            'success', false,
            'error', 'screen_limit_exceeded',
            'access', v_access
          );
        END IF;
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'cannot_add_devices',
          'access', v_access
        );
      END IF;
    ELSIF v_existing_status <> 'active' THEN
      IF NOT (v_access->>'can_add_devices')::boolean
         AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'screen_limit_exceeded',
          'access', v_access
        );
      END IF;
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'dev_mode', v_dev,
      'error', 'invalid_menu_type'
    );
  END IF;

  INSERT INTO public.device_activations (
    code, owner_id, menu_type, status, device_name, linked_at, activated_at, last_seen_at
  )
  VALUES (
    v_code,
    v_uid,
    p_menu_type,
    'active',
    NULLIF(trim(p_device_name), ''),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    menu_type = COALESCE(EXCLUDED.menu_type, device_activations.menu_type),
    status = 'active',
    device_name = COALESCE(EXCLUDED.device_name, device_activations.device_name),
    linked_at = COALESCE(device_activations.linked_at, NOW()),
    activated_at = NOW(),
    last_seen_at = NOW()
  WHERE device_activations.owner_id = v_uid;

  IF NOT v_dev THEN
    PERFORM public.consume_verification_code(v_code, v_uid);
    DELETE FROM public.kiosk_pairing_announcements WHERE code = v_code;
  END IF;
  PERFORM public.enforce_owner_device_limits(v_uid);

  IF NOT v_dev THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.registered',
      jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
    );
  END IF;

  v_access := public.resolve_subscription_access(v_uid);

  IF v_dev THEN
    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'dev_mode', true,
      'code', v_code,
      'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
      'access', v_access
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', v_access
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_kiosk_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kiosk_state(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.register_device_with_license(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device_with_license(text, text, text, text) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

-- إزالة قفل «محاولات كثيرة» الناتج عن polling قبل الإصلاح
UPDATE public.kiosk_rate_limits
SET locked_until = NULL, fail_count = 0
WHERE locked_until IS NOT NULL OR fail_count > 0;

COMMIT;
