-- ============================================================
-- حذف حساب بشكل كامل ونهائي (Supabase SQL Editor)
-- يشمل: Auth + profile + venue + أجهزة + اشتراك + سجلات
--
-- ⚠️ لا رجعة فيه. نفّذ فقط على حسابات التطوير أو بطلب صريح.
-- ⚠️ غيّر البريد أدناه ثم Run
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_email TEXT := 'owner@meez.app';  -- ← غيّر البريد هنا
  v_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'لم يُعثر على مستخدم بالبريد: %', v_email;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id)
  INTO v_profile_exists;

  RAISE NOTICE 'بدء الحذف النهائي للمستخدم % (%)', v_email, v_user_id;

  -- سجلات لا تُحذف تلقائياً (ON DELETE SET NULL)
  DELETE FROM public.audit_logs WHERE owner_id = v_user_id;
  DELETE FROM public.admin_logs
  WHERE target_owner_id = v_user_id OR admin_id = v_user_id;

  -- جلسات Auth (إن وُجدت)
  DELETE FROM auth.sessions WHERE user_id = v_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  -- admin_users → CASCADE من auth.users
  -- profiles → CASCADE → venues, device_activations, subscriptions,
  --   device_pairing_sessions, subscription_history
  DELETE FROM auth.users WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'فشل حذف auth.users للمعرّف: %', v_user_id;
  END IF;

  RAISE NOTICE '✓ تم حذف الحساب نهائياً: %', v_email;

  IF v_profile_exists THEN
    RAISE NOTICE '✓ بيانات المنشأة والأجهزة والاشتراك حُذفت عبر CASCADE';
  END IF;
END $$;

COMMIT;

-- تحقق (يجب أن يُرجع 0 صفوف):
-- SELECT id, email FROM auth.users WHERE email = 'owner@meez.app';
-- SELECT id FROM public.profiles WHERE email = 'owner@meez.app';
