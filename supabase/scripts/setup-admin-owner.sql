-- إعداد حساب owner@meez.app: تأكيد البريد + تجربة 7 أيام + أدمن
-- نفّذ في Supabase SQL Editor بعد التسجيل

DO $$
DECLARE
  v_email TEXT := 'owner@meez.app';
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود: % — سجّل الحساب أولاً من /auth', v_email;
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = v_now, updated_at = v_now
  WHERE id = v_user_id;

  INSERT INTO public.profiles (id, email, full_name, venue_name, role)
  SELECT
    v_user_id,
    v_email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', 'مالك المنشأة'),
    COALESCE(u.raw_user_meta_data ->> 'venue_name', 'مقهى تجريبي'),
    'owner'
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    venue_name = COALESCE(EXCLUDED.venue_name, public.profiles.venue_name),
    updated_at = v_now;

  INSERT INTO public.subscriptions (
    owner_id, status, screen_count, device_limit,
    trial_started_at, trial_ends_at, manual_activation
  )
  VALUES (
    v_user_id, 'trial', 1, 1,
    v_now, v_now + INTERVAL '7 days', false
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    status = 'trial',
    screen_count = 1,
    device_limit = 1,
    trial_started_at = v_now,
    trial_ends_at = v_now + INTERVAL '7 days',
    manual_activation = false,
    updated_at = v_now;

  INSERT INTO public.admin_users (user_id, role, email, full_name, is_active)
  VALUES (v_user_id, 'super_admin', v_email, 'Platform Admin', true)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = v_now;

  RAISE NOTICE '✓ تم: تأكيد البريد + تجربة 7 أيام + super_admin لـ %', v_email;
END $$;
