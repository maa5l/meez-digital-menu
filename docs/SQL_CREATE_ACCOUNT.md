# إنشاء حساب في Supabase — SQL

## الطريقة 1: من لوحة Supabase (موصى بها)

1. افتح [SQL Editor](https://supabase.com/dashboard/project/feorprugthydhyytvebe/sql/new)
2. انسخ محتوى الملف:
   `supabase/migrations/20260517120000_accounts_and_profiles.sql`
3. اضغط **Run**

سيُنشأ:
- جدول `public.profiles`
- سياسات RLS
- حساب تجريبي:
  - **البريد:** `owner@meez.app`
  - **كلمة المرور:** `MeezOwner2026!`
  - **مفعّل** (بدون انتظار البريد)

---

## الطريقة 2: تفعيل حساب موجود فقط

```sql
UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  confirmed_at = COALESCE(confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'owner@meez.app';
```

---

## الطريقة 3: إنشاء حساب جديد (غيّر القيم)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'you@example.com';      -- غيّر هنا
  v_password TEXT := 'YourPass123!';       -- 8+ أحرف
  v_venue TEXT := 'اسم المقهى';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'البريد مستخدم مسبقاً: %', v_email;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at, confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('venue_name', v_venue, 'role', 'owner'),
    NOW(), NOW()
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', NOW(), NOW(), NOW()
  );
END $$;
```

---

## بعد الإنشاء — تسجيل الدخول من التطبيق

في `.env.local` للإنتاج/اختبار Supabase Auth:

```env
VITE_FORCE_SUPABASE_AUTH=true
VITE_ENABLE_MOCK_AUTH=false
```

ثم من التطبيق: `/auth` → تسجيل الدخول بالبريد وكلمة المرور.

---

## أمان

- لا تنفّذ سكربت إنشاء الحساب في الإنتاج العام.
- لا ترفع كلمات المرور إلى Git.
- للإنتاج: استخدم التسجيل من التطبيق أو Supabase Auth API.
