-- ============================================================
-- كود التحقق — ربط الدخول للحساب + تفعيل الأجهزة
-- ============================================================

-- تحقق عند تسجيل الدخول (قبل المصادقة): الكود + البريد يطابقان جلسة صالحة
CREATE OR REPLACE FUNCTION public.verify_login_verification_code(
  p_code TEXT,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_pairing_sessions dps
    JOIN public.profiles p ON p.id = dps.owner_id
    WHERE upper(trim(dps.code)) = upper(trim(p_code))
      AND lower(trim(p.email)) = lower(trim(p_email))
      AND dps.expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.verify_login_verification_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login_verification_code(TEXT, TEXT) TO anon, authenticated;

-- تحقق للمالك المسجّل: الكود صادر من لوحة التحكم لنفس الحساب
CREATE OR REPLACE FUNCTION public.verify_owner_verification_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_pairing_sessions dps
    WHERE dps.owner_id = auth.uid()
      AND upper(trim(dps.code)) = upper(trim(p_code))
      AND dps.expires_at > NOW()
  );
$$;

REVOKE ALL ON FUNCTION public.verify_owner_verification_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_owner_verification_code(TEXT) TO authenticated;

-- استهلاك الكود بعد تسجيل الدخول أو تفعيل الجهاز
CREATE OR REPLACE FUNCTION public.consume_verification_code(p_code TEXT, p_owner_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := COALESCE(p_owner_id, auth.uid());
BEGIN
  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.device_pairing_sessions
  WHERE owner_id = v_owner
    AND upper(trim(code)) = upper(trim(p_code));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_verification_code(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_verification_code(TEXT, UUID) TO authenticated;

-- تحديث تسجيل الجهاز: يتطلب كود تحقق صالح للأجهزة الجديدة
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
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_access JSONB;
  v_status public.subscription_status;
  v_existing_owner UUID;
  v_existing_status public.device_license_status;
  v_has_session BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code !~ '^QM-[A-HJ-NP-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT da.owner_id, da.status
  INTO v_existing_owner, v_existing_status
  FROM public.device_activations da
  WHERE da.code = v_code
  LIMIT 1;

  IF v_existing_owner IS NOT NULL AND v_existing_owner <> v_uid THEN
    PERFORM public.write_audit_log(
      v_uid,
      'device.register_denied',
      jsonb_build_object('code', v_code, 'reason', 'code_already_claimed')
    );
    RETURN jsonb_build_object('ok', false, 'error', 'code_already_claimed');
  END IF;

  -- جهاز جديد: يجب كود تحقق من لوحة التحكم
  IF v_existing_owner IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.device_pairing_sessions dps
      WHERE dps.owner_id = v_uid
        AND dps.code = v_code
        AND dps.expires_at > NOW()
    ) INTO v_has_session;

    IF NOT v_has_session THEN
      PERFORM public.write_audit_log(
        v_uid,
        'device.register_denied',
        jsonb_build_object('code', v_code, 'reason', 'verification_code_invalid')
      );
      RETURN jsonb_build_object('ok', false, 'error', 'verification_code_invalid');
    END IF;
  END IF;

  v_access := public.resolve_subscription_access(v_uid);
  v_status := (v_access->>'status')::public.subscription_status;

  IF v_existing_owner IS NULL THEN
    IF NOT (v_access->>'can_add_devices')::boolean THEN
      IF (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
        PERFORM public.write_audit_log(v_uid, 'device.register_denied', jsonb_build_object('code', v_code, 'reason', 'screen_limit'));
        RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
      END IF;
      RETURN jsonb_build_object('ok', false, 'error', 'cannot_add_devices', 'access', v_access);
    END IF;
  ELSIF v_existing_status <> 'active' THEN
    IF NOT (v_access->>'can_add_devices')::boolean
       AND (v_access->>'active_device_count')::int >= (v_access->>'screen_count')::int THEN
      RETURN jsonb_build_object('ok', false, 'error', 'screen_limit_exceeded', 'access', v_access);
    END IF;
  END IF;

  IF p_menu_type IS NOT NULL AND p_menu_type NOT IN ('products', 'crops') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_menu_type');
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

  PERFORM public.consume_verification_code(v_code, v_uid);
  PERFORM public.enforce_owner_device_limits(v_uid);

  PERFORM public.write_audit_log(
    v_uid,
    'device.registered',
    jsonb_build_object('code', v_code, 'menu_type', p_menu_type)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'device_id', (SELECT device_id FROM public.device_activations WHERE code = v_code),
    'access', public.resolve_subscription_access(v_uid)
  );
END;
$$;
