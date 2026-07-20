-- تأكيد بريد مستخدم (Supabase SQL Editor)
-- confirmed_at عمود مُولَّد — لا تُحدّثه يدوياً

UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'owner@meez.app';  -- ← غيّر البريد

-- تحقق:
-- SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users WHERE email = 'owner@meez.app';
