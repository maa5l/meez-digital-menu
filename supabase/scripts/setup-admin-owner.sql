-- إعداد حساب owner@meez.app: تأكيد البريد + إعادة كلمة المرور + تجربة 7 أيام + أدمن
-- نفّذ في Supabase SQL Editor
-- كلمة المرور بعد التنفيذ: MeezOwner2026!

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_email TEXT := 'owner@meez.app';
  v_password TEXT := 'MeezOwner2026!';
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
  SET
    encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, v_now),
    updated_at = v_now,
    -- GoTrue يرفض NULL في أعمدة التوكن → Database error querying schema
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    phone_change = COALESCE(phone_change, '')
  WHERE id = v_user_id;

  -- تأكد من وجود هوية email (بدونها يفشل تسجيل الدخول أحياناً)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_now,
    v_now,
    v_now
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = 'email'
  );

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

  RAISE NOTICE '✓ تم: كلمة المرور = MeezOwner2026! + تجربة 7 أيام + super_admin لـ %', v_email;
END $$;
