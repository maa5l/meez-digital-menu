# إعداد Supabase — مشروع ميز

**Project ref:** `feorprugthydhyytvebe`  
**URL:** `https://feorprugthydhyytvebe.supabase.co`

## ما تم إعداده تلقائياً

- `supabase init` — مجلد `supabase/` مع `config.toml`
- `@supabase/supabase-js` — عميل في `src/lib/supabase/client.ts`
- `.env.local` — متغيرات Supabase (غير مرفوعة لـ Git)
- سكربتات npm: `npm run supabase:link` وغيرها

## خطوات يجب تنفيذها يدوياً (مرة واحدة)

### 1) تسجيل الدخول في CLI

```bash
npx supabase login
```

يفتح المتصفح لتسجيل الدخول.

### 2) ربط المشروع البعيد

```bash
npm run supabase:link
```

أو:

```bash
npx supabase link --project-ref feorprugthydhyytvebe
```

سيُطلب منك **كلمة مرور قاعدة البيانات** من:  
Supabase Dashboard → Project Settings → Database.

### 3) كلمة مرور Postgres

في `.env.local` (أو `server/.env`) أضف:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.feorprugthydhyytvebe.supabase.co:5432/postgres
```

استبدل `YOUR_PASSWORD` بكلمة المرور من لوحة التحكم.

## المفاتيح

| المتغير | أين يُستخدم |
|---------|-------------|
| `VITE_SUPABASE_URL` | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Frontend (publishable / anon فقط) |
| `DATABASE_URL` | Server / migrations فقط |
| `SUPABASE_SERVICE_ROLE_KEY` | **خادم فقط** — لا تضعه في Vite |

## أوامر مفيدة

```bash
npm run supabase:status    # حالة Supabase المحلي
npm run supabase:db:push   # رفع migrations للسحابة (بعد link)
npm run supabase:db:pull   # سحب schema من السحابة
```

## استخدام العميل في الكود

```ts
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

if (isSupabaseConfigured()) {
  const supabase = getSupabase();
  const { data } = await supabase.from("products").select("*");
}
```

## أمان

- لا ترفع `.env.local` أو **service role key** إلى Git.
- إذا ظهرت المفاتيح في محادثة عامة، غيّرها من Dashboard → Settings → API.
