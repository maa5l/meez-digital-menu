# Subscription Enforcement Layer

طبقة إلزام الاشتراك — القرارات على **Postgres (RPC + RLS)** وليس على الواجهة فقط.

## الحالات

| الحالة | الكشك | تعديل المنيو | إضافة أجهزة |
|--------|-------|--------------|-------------|
| `active` | ✅ | ✅ | ✅ (ضمن `screen_count`) |
| `trial` | ✅ | ✅ | ✅ |
| `past_due` | ✅ | ❌ | ❌ |
| `grace_period` | ✅ + banner | ❌ | ❌ |
| `suspended` | ❌ | ❌ | ❌ |
| `expired` / `canceled` | ❌ | ❌ | ❌ |

## RPCs أساسية

| RPC | الاستخدام |
|-----|-----------|
| `check_kiosk_access(code)` | بوابة الكشك (anon) |
| `get_venue_for_device(code)` | يستدعي التحقق داخلياً — يرجع `NULL` إن مرفوض |
| `activate_device_with_license` | تفعيل جهاز مع حد الشاشات |
| `get_owner_subscription` | لوحة التحكم |
| `process_billing_webhook` | خادم API فقط (service role) |

## Webhook (خادم Express)

```bash
POST /api/v1/webhooks/billing
Header: x-meez-signature: sha256=<hmac>
```

Body مثال:

```json
{
  "event": "payment.success",
  "owner_id": "uuid",
  "screen_count": 3,
  "billing_cycle": "monthly"
}
```

## تطبيق Migration

```bash
npm run supabase:db:push
```

أو نفّذ `supabase/migrations/20260525120000_subscription_enforcement.sql` في SQL Editor.

## التسعير المرجعي

- شهري: 45 ريال / شاشة
- سنوي: 450 ريال / شاشة

`screen_count` في جدول `subscriptions` = عدد التراخيص المدفوعة.
