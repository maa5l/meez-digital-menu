# Core Platform Security Layer

طبقة الأمان الأساسية لمنصة **قائمة** — عزل المستأجرين، ترخيص الأجهزة، وكتابة البيانات عبر RPC فقط.

## Migration

```bash
npm run supabase:db:push
```

الملف: `supabase/migrations/20260525150000_core_platform_security.sql`

## مبادئ

| المبدأ | التنفيذ |
|--------|---------|
| Frontend = request only | لا INSERT/UPDATE على `venues` أو `device_activations` |
| Backend = authority | RPCs بـ `SECURITY DEFINER` + `auth.uid()` |
| DB = source of truth | `pullVenueFromCloud` يفضّل السحابة عند وجود بيانات |
| كشك = device + subscription | `check_kiosk_access` → `get_venue_for_device` |
| معاينة = مسجّل فقط | `get_dashboard_preview_venue` |

## RPCs

| RPC | من | الغرض |
|-----|-----|--------|
| `register_device_with_license` | authenticated | تسجيل جهاز + حد الشاشات |
| `deactivate_device` | authenticated | إلغاء تفعيل (بدون حذف الكود) |
| `update_venue_data` | authenticated | حفظ منيو + فحص `dashboard_edit_allowed` |
| `get_dashboard_preview_venue` | authenticated | معاينة من لوحة التحكم |
| `check_kiosk_access` | anon | بوابة الكشك |
| `get_venue_for_device` | anon | منيو بعد اجتياز البوابة |
| `write_client_audit_log` | authenticated | أحداث واجهة (whitelist) |
| `list_owner_devices` | authenticated | قائمة أجهزة المالك |
| `enforce_owner_device_limits` | internal | تعطيل الأقدم عند تجاوز الحد |

## ما تم إغلاقه

- كتابة مباشرة على `device_activations` / `venues`
- `confirm_subscription_payment` من العميل (authenticated)
- معاينة `/menu?preview=1` بدون جلسة + اشتراك يسمح بالتعديل/الكشك
- مزامنة أجهزة من `venue-store` إلى DB
- إعادة استخدام `device_code` لحساب آخر

## اختبار القبول

1. محاولة `supabase.from('device_activations').insert(...)` → مرفوض
2. محاولة `supabase.from('venues').upsert(...)` → مرفوض
3. كشك بدون `QM-XXXX` مسجّل → مرفوض
4. تفعيل جهاز فوق `screen_count` → `screen_limit_exceeded`
5. معاينة بدون تسجيل → مرفوض
6. تعديل منيو في `grace_period` → `subscription_edit_blocked`
