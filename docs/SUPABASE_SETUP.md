# إعداد Supabase — مشروع ميز

**Project ref:** `feorprugthydhyytvebe`  
**URL:** `https://feorprugthydhyytvebe.supabase.co`

## ما يُخزَّن في قاعدة البيانات

| الجدول / الدالة | المحتوى |
|-----------------|---------|
| `profiles` | المستخدمون (مرتبط بـ Supabase Auth) |
| `venues` | بيانات المنشأة كاملة: تصنيفات، منتجات، محاصيل، أجهزة، ثيم، اشتراك |
| `device_activations` | ربط رمز الشاشة بصاحب الحساب |
| `get_venue_for_device(code)` | جلب منيو الشاشة بدون تسجيل دخول |
| `is_device_activated(code)` | التحقق من تفعيل الجهاز |

التطبيق يحفظ **محلياً** (cache سريع) و**في Supabase** عند ضبط المفاتيح وتعطيل mock auth.

## إعداد `.env.local`

```env
VITE_SUPABASE_URL=https://feorprugthydhyytvebe.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key

# لتفعيل Supabase Auth بدل الحساب التجريبي المحلي:
VITE_ENABLE_MOCK_AUTH=false
VITE_FORCE_SUPABASE_AUTH=true
```

## تطبيق الـ migrations (مرة واحدة)

### الطريقة 1 — Supabase Dashboard

1. افتح **SQL Editor**
2. نفّذ بالترتيب:
   - `supabase/migrations/20260517120000_accounts_and_profiles.sql`
   - `supabase/migrations/20260519233000_venues_and_device_activations.sql`
   - `supabase/migrations/20260520010000_profiles_insert_policy.sql`
   - `supabase/migrations/20260520020000_ensure_profile_rpc.sql`

**أو ملف واحد سريع عند الخطأ:** `supabase/FIX_PROFILES.sql`

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
2. **تسجيل الدخول:** سحب أحدث بيانات من السحابة
3. **تفعيل جهاز:** من الأجهزة → يُسجَّل في `device_activations`
4. **شاشة المنيو:** تقرأ عبر `get_venue_for_device` كل ~2.5 ثانية

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
