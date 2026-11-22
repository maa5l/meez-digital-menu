-- لوق التسجيل والتفعيل في audit_logs + توسيع write_client_audit_log

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, venue_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'venue_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'owner')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    venue_name = COALESCE(NULLIF(EXCLUDED.venue_name, ''), public.profiles.venue_name),
    updated_at = NOW();

  PERFORM public.write_audit_log(
    NEW.id,
    'auth.register',
    jsonb_build_object(
      'email', NEW.email,
      'full_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      'venue_name', COALESCE(NEW.raw_user_meta_data ->> 'venue_name', ''),
      'source', 'auth_trigger'
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_client_audit_log(
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_action NOT IN (
    'auth.login',
    'auth.logout',
    'auth.register',
    'device.register_attempt',
    'device.activated',
    'device.registered',
    'menu.preview_open',
    'subscription.view',
    'dashboard.navigation'
  ) THEN
    RAISE EXCEPTION 'invalid_audit_action';
  END IF;

  RETURN public.write_audit_log(v_uid, p_action, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.write_client_audit_log(TEXT, JSONB) TO authenticated;

-- توحيد اسم حدث التفعيل في RPC التسجيل (إن وُجدت النسخة الحالية)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'register_device_with_license'
  ) THEN
    -- لا نستبدل الدالة كاملة هنا؛ نضيف لوقاً مكمّلاً عبر wrapper غير مطلوب.
    -- التفعيل يُسجَّل كـ device.registered من الدالة الحالية + device.activated من العميل.
    NULL;
  END IF;
END $$;
