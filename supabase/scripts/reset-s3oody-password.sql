-- إعادة تعيين كلمة مرور S3oody16@gmail.com بشكل موثوق
-- بعد التنفيذ: S3oody16@gmail.com / MeezUser2026!
-- نفّذ كامل الملف دفعة واحدة في SQL Editor

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
DECLARE
  v_email TEXT := 's3oody16@gmail.com';
  v_password TEXT := 'MeezUser2026!';
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_hash TEXT;
  v_updated INT := 0;
BEGIN
  -- ابحث في auth.users أولاً، ثم عبر profiles إن لزم
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(trim(u.email)) = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT p.id INTO v_user_id
    FROM public.profiles p
    WHERE lower(trim(p.email)) = v_email
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود في auth.users ولا profiles: %', v_email;
  END IF;

  v_hash := extensions.crypt(v_password, extensions.gen_salt('bf', 10));

  UPDATE auth.users
  SET
    email = v_email,
    encrypted_password = v_hash,
    email_confirmed_at = COALESCE(email_confirmed_at, v_now),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    email_change_token_current = '',
    phone_change_token = '',
    reauthentication_token = '',
    phone_change = '',
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      '{"provider":"email","providers":["email"]}'::jsonb,
    updated_at = v_now
  WHERE id = v_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'لم يُحدَّث أي صف في auth.users للمعرّف %', v_user_id;
  END IF;

  -- هوية email مطلوبة لتسجيل الدخول
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      v_now, v_now, v_now
    );
  ELSE
    UPDATE auth.identities
    SET
      identity_data = COALESCE(identity_data, '{}'::jsonb) ||
        jsonb_build_object('email', v_email, 'email_verified', true),
      updated_at = v_now
    WHERE user_id = v_user_id AND provider = 'email';
  END IF;

  -- أبطل جلسات قديمة قد تسبب لبساً
  BEGIN
    DELETE FROM auth.sessions WHERE user_id = v_user_id;
  EXCEPTION
    WHEN undefined_table OR insufficient_privilege THEN
      NULL;
  END;

  BEGIN
    DELETE FROM auth.refresh_tokens
    WHERE user_id::text = v_user_id::text;
  EXCEPTION
    WHEN undefined_table OR undefined_column OR insufficient_privilege THEN
      NULL;
  END;

  UPDATE public.profiles
  SET email = v_email, updated_at = v_now
  WHERE id = v_user_id;

  RAISE NOTICE 'تم: % / MeezUser2026! (id=%)', v_email, v_user_id;
END $$;

-- تحقق
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS confirmed,
  length(COALESCE(u.encrypted_password, '')) > 20 AS has_password,
  EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  ) AS has_email_identity,
  (u.encrypted_password = extensions.crypt('MeezUser2026!', u.encrypted_password)) AS password_matches
FROM auth.users u
WHERE lower(trim(u.email)) = 's3oody16@gmail.com';
