# إعداد Supabase — مشروع ميز

**Project ref:** `feorprugthydhyytvebe`  
**URL:** `https://feorprugthydhyytvebe.supabase.co`

## ما يُخزَّن في قاعدة البيانات

| الجدول / الدالة | المحتوى |
|-----------------|---------|
| `profiles` | الحساب: بريد، اسم المالك، اسم المنشأة، جوال (مرتبط بـ Auth) |
| `venues` | بيانات المنشأة كاملة: تصنيفات، منتجات، محاصيل، أجهزة، ثيم، اشتراك (`owner_id` → `profiles`) |
| `device_activations` | ربط رمز الشاشة بصاحب الحساب |
| `get_venue_for_device(code)` | جلب منيو الشاشة بدون تسجيل دخول |
| `is_device_activated(code)` | التحقق من تفعيل الجهاز |

التطبيق يحفظ **محلياً** (cache سريع) و**في Supabase** عند ضبط المفاتيح وتعطيل mock auth.

## إعداد `.env.local`

من Supabase → **Project Settings → API**:

| الحقل في Supabase | متغير التطبيق |
|-------------------|----------------|
| Project URL | `VITE_SUPABASE_URL` |
| **anon public** (JWT يبدأ بـ `eyJ...`) | `VITE_SUPABASE_ANON_KEY` |

```env
VITE_SUPABASE_URL=https://feorprugthydhyytvebe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_ENABLE_MOCK_AUTH=false
```

> على **Vercel** استخدم مفتاح **anon public** (`eyJ...`) وليس `sb_publishable_...` إذا رفض المنصة القيمة.  
> بعد أي تعديل على `.env.local` أعد تشغيل `npm run dev`.

### Vercel — أخطاء شائعة

| الرسالة | الحل |
|---------|------|
| `already exists` | عدّل المتغير الحالي (Edit) بدل إنشاء نسخة ثانية |
| `is invalid` | احذف المتغير؛ الصق مفتاح `eyJ...` كاملاً بدون `"` أو مسافات |
| اسم غير صالح | الاسم فقط: `VITE_SUPABASE_ANON_KEY` (شرطات سفلية `_` وليس `-`) |

## تطبيق الـ migrations (مرة واحدة)

### الطريقة 1 — Supabase Dashboard

1. افتح **SQL Editor**
2. نفّذ بالترتيب:
   - `supabase/migrations/20260517120000_accounts_and_profiles.sql`
   - `supabase/migrations/20260519233000_venues_and_device_activations.sql`
   - `supabase/migrations/20260520010000_profiles_insert_policy.sql`
   - `supabase/migrations/20260520020000_ensure_profile_rpc.sql`
   - `supabase/migrations/20260520120000_device_pairing_sessions.sql`
   - `supabase/migrations/20260520130000_profiles_phone_and_venue_link.sql`
   - `supabase/migrations/20260520140000_verification_code_flow.sql`

**أو ملف واحد سريع عند الخطأ:** `supabase/FIX_PROFILES.sql`  
**عند `PGRST204` وعمود phone:** `supabase/FIX_PROFILES_PHONE.sql`  
**عند «تعذّر إنشاء كود التحقق» أو `profiles does not exist`:** نفّذ **`supabase/FIX_VERIFICATION_CODE.sql`** (ملف واحد يُنشئ كل الجداول)

### الطريقة 2 — CLI

```bash
npx supabase login
npm run supabase:link
npm run supabase:db:push
```

## تسجيل الدخول

- **تسجيل جديد:** من `/auth` — يُنشأ `profile` تلقائياً
- **حساب تجريبي (بعد migration الأولى):** `owner@meez.app` / `MeezOwner2026!` (غيّر كلمة المرور من Dashboard)

## سلوك التطبيق

1. **لوحة التحكم:** كل حفظ → `venues` في Supabase + cache محلي
2. **الإعدادات:** تحديث `profiles` + مزامنة اسم المنشأة مع `venues.data`
3. **تسجيل الدخول:** إنشاء/تحديث `profiles` + `venues` ثم سحب أحدث بيانات
4. **تفعيل جهاز:** من الأجهزة → يُسجَّل في `device_activations`
5. **شاشة المنيو:** تقرأ عبر `get_venue_for_device` كل ~2.5 ثانية

## أوامر مفيدة

```bash
npm run supabase:status
npm run supabase:db:push
npm run dev
```

## أمان

- لا ترفع `.env.local` أو **service role key** إلى Git.
- RLS مفعّل: كل مالك يرى/يعدّل منشأته فقط.
- الشاشات تقرأ المنيو عبر دوال `SECURITY DEFINER` المحدودة (رمز الجهاز فقط).
