-- Bootstrap first platform admin (run once in Supabase SQL Editor)
-- Replace email with your admin account email (must exist in auth.users)

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@meez.app';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_email;
  END IF;

  INSERT INTO public.admin_users (user_id, role, email, full_name, is_active)
  VALUES (v_user_id, 'super_admin', v_email, 'Platform Admin', true)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = NOW();

  RAISE NOTICE 'Admin bootstrapped for %', v_email;
END $$;
