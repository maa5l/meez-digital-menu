-- إنشاء يوزرين أدمن: ريان + mas5l (super_admin) + لوق التسجيل/التفعيل
-- بعد التنفيذ:
--   rayan@meez.app / MeezUser2026!  (ريان — مدير عام)
--   mas5l@meez.app / MeezUser2026!  (mas5l — مدير عام)
-- نفّذ في SQL Editor لنفس مشروع التطبيق

-- على Supabase تكون pgcrypto في مخطط extensions
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- الامتداد موجود مسبقاً
END $$;

-- لوق مسموح من العميل: تسجيل + تفعيل
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

  INSERT INTO public.audit_logs (owner_id, action, metadata)
  VALUES (
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

CREATE OR REPLACE FUNCTION public._meez_upsert_owner_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_venue TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_hash TEXT := extensions.crypt(p_password, extensions.gen_salt('bf'));
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(p_email))
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
      lower(trim(p_email)),
      v_hash,
      v_now,
      '', '', '', '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', lower(trim(p_email)),
        'full_name', p_full_name,
        'venue_name', p_venue,
        'email_verified', true
      ),
      v_now,
      v_now
    );
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
      phone_change = COALESCE(phone_change, ''),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'full_name', p_full_name,
        'venue_name', p_venue,
        'email_verified', true
      )
    WHERE id = v_user_id;
  END IF;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email)), 'email_verified', true),
    'email',
    v_now, v_now, v_now
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = 'email'
  );

  INSERT INTO public.profiles (id, email, full_name, venue_name, role)
  VALUES (v_user_id, lower(trim(p_email)), p_full_name, p_venue, 'owner')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    venue_name = EXCLUDED.venue_name,
    updated_at = v_now;

  INSERT INTO public.subscriptions (
    owner_id, status, screen_count, device_limit,
    trial_started_at, trial_ends_at, manual_activation
  )
  VALUES (v_user_id, 'trial', 1, 1, v_now, v_now + INTERVAL '7 days', false)
  ON CONFLICT (owner_id) DO UPDATE SET
    status = 'trial',
    screen_count = GREATEST(public.subscriptions.screen_count, 1),
    device_limit = GREATEST(public.subscriptions.device_limit, 1),
    trial_ends_at = GREATEST(public.subscriptions.trial_ends_at, v_now + INTERVAL '7 days'),
    updated_at = v_now;

  INSERT INTO public.admin_users (user_id, role, email, full_name, is_active)
  VALUES (v_user_id, 'super_admin', lower(trim(p_email)), p_full_name, true)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_active = true,
    updated_at = v_now;

  INSERT INTO public.audit_logs (owner_id, action, metadata)
  VALUES (
    v_user_id,
    'auth.register',
    jsonb_build_object(
      'email', lower(trim(p_email)),
      'full_name', p_full_name,
      'venue_name', p_venue,
      'source', 'sql_bootstrap',
      'admin_role', 'super_admin'
    )
  );

  RETURN v_user_id;
END;
$$;

DO $$
DECLARE
  v_ryan UUID;
  v_mas UUID;
BEGIN
  v_ryan := public._meez_upsert_owner_user(
    'rayan@meez.app',
    'MeezUser2026!',
    'ريان',
    'منشأة ريان'
  );
  v_mas := public._meez_upsert_owner_user(
    'mas5l@meez.app',
    'MeezUser2026!',
    'mas5l',
    'منشأة mas5l'
  );
  RAISE NOTICE 'ryan=% mas5l=%', v_ryan, v_mas;
END $$;

DROP FUNCTION IF EXISTS public._meez_upsert_owner_user(TEXT, TEXT, TEXT, TEXT);

SELECT
  u.email,
  u.raw_user_meta_data ->> 'full_name' AS full_name,
  au.role AS admin_role,
  au.is_active,
  u.email_confirmed_at IS NOT NULL AS confirmed
FROM auth.users u
LEFT JOIN public.admin_users au ON au.user_id = u.id
WHERE lower(u.email) IN ('rayan@meez.app', 'mas5l@meez.app')
ORDER BY u.email;
