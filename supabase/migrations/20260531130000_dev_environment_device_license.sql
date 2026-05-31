-- ============================================================
-- بيئة التطوير vs الإنتاج لتفعيل الأجهزة
-- يُقرأ app.environment عبر current_setting('app.environment', true)
-- التطوير المحلي: ALTER ROLE authenticator SET app.environment TO 'development';
-- الإنتاج: اترك غير مضبوط أو = 'production'
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_environment()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      nullif(trim(current_setting('app.environment', true)), ''),
      'production'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.app_is_development()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.app_environment() IN ('development', 'dev', 'local');
$$;

CREATE OR REPLACE FUNCTION public.resolve_dev_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.app_environment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_development() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_dev_owner_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_environment() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.app_is_development() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_dev_owner_id() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.register_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev BOOLEAN := public.app_is_development();
  v_uid UUID;
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
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

CREATE OR REPLACE FUNCTION public.activate_device_with_license(
  p_code TEXT,
  p_menu_type TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.register_device_with_license(p_code, p_menu_type, p_device_name);
END;
$$;

REVOKE ALL ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_device_with_license(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.activate_device_with_license(TEXT, TEXT, TEXT) TO authenticated, anon;
