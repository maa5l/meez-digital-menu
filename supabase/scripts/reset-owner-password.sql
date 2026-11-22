-- إصلاح دخول owner@meez.app
-- ينشئ الحساب إن لم يوجد، أو يعيد كلمة المرور إن وُجد
-- بعد التنفيذ: owner@meez.app / MeezOwner2026!
-- نفّذ في SQL Editor لنفس مشروع التطبيق (zzrbqiqygiqwudozexis)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_email TEXT := 'owner@meez.app';
  v_password TEXT := 'MeezOwner2026!';
  v_venue TEXT := 'مقهى تجريبي';
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_hash TEXT := extensions.crypt(v_password, extensions.gen_salt('bf'));
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      email_change_token_current, phone_change_token,
      reauthentication_token, phone_change,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_hash,
      v_now,
      '', '', '', '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'venue_name', v_venue,
        'email_verified', true
      ),
      v_now,
      v_now
    );

    RAISE NOTICE 'تم إنشاء المستخدم %', v_email;
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = v_hash,
      email_confirmed_at = COALESCE(email_confirmed_at, v_now),
      updated_at = v_now,
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      phone_change = COALESCE(phone_change, '')
    WHERE id = v_user_id;

    RAISE NOTICE 'تم تحديث كلمة مرور %', v_email;
  END IF;

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
    v_now, v_now, v_now
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = 'email'
  );

  INSERT INTO public.profiles (id, email, full_name, venue_name, role)
  VALUES (v_user_id, v_email, 'مالك المنشأة', v_venue, 'owner')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = v_now;

  INSERT INTO public.subscriptions (
    owner_id, status, screen_count, device_limit,
    trial_started_at, trial_ends_at, manual_activation
  )
  VALUES (v_user_id, 'trial', 1, 1, v_now, v_now + INTERVAL '7 days', false)
  ON CONFLICT (owner_id) DO UPDATE SET
    status = 'trial',
    trial_ends_at = GREATEST(public.subscriptions.trial_ends_at, v_now + INTERVAL '7 days'),
    updated_at = v_now;

  INSERT INTO public.admin_users (user_id, role, email, full_name, is_active)
  VALUES (v_user_id, 'super_admin', v_email, 'Platform Admin', true)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = v_now;
END $$;

SELECT id, email, email_confirmed_at IS NOT NULL AS confirmed
FROM auth.users
WHERE lower(trim(email)) = 'owner@meez.app';
