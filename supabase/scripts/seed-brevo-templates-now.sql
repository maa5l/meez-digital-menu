-- Seed Brevo notification templates (ar / email)
BEGIN;

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  'password_reset',
  'email',
  'ar',
  'رمز إعادة تعيين كلمة المرور — Meez',
  $brevo$<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;color:#1f1a16;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:center;">
                <div style="margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 12px;font-size:22px;direction:rtl;">إعادة تعيين كلمة المرور</h2>
                <p dir="rtl" style="margin:0 0 20px;color:#6b6259;line-height:1.8;direction:rtl;text-align:center;">طلبت إعادة تعيين كلمة المرور لحساب {{params.email}}. استخدم الرمز التالي:</p>
                <div style="direction:ltr;letter-spacing:10px;font-size:36px;font-weight:800;color:#9b6a2f;margin:18px 0;text-align:center;">
                  {{params.otp_code}}
                </div>
                <p dir="rtl" style="margin:20px 0 0;color:#8a8178;font-size:13px;direction:rtl;">إذا لم تطلب ذلك، تجاهل الرسالة. الرمز ينتهي خلال دقائق.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  'welcome',
  'email',
  'ar',
  'أهلاً بك في Meez',
  $brevo$<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;color:#1f1a16;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
                <div style="text-align:center;margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 16px;font-size:22px;text-align:center;direction:rtl;">أهلاً بك في Meez</h2>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">مرحباً {{params.venue_name}}،</p>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">تم إنشاء حسابك بنجاح. يمكنك الآن تجهيز منيوك الرقمي وإضافة المنتجات والأجهزة.</p>
                <p dir="rtl" style="margin:0 0 18px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">بدأت معك فترة تجربة مجانية لمدة {{params.trial_days}} أيام.</p>
                <div style="text-align:center;margin:22px 0;">
                  <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">افتح لوحة التحكم</a>
                </div>
                <p dir="rtl" style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;direction:rtl;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  'renewal_reminder',
  'email',
  'ar',
  'تذكير: اشتراكك ينتهي قريباً — Meez',
  $brevo$<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;color:#1f1a16;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
                <div style="text-align:center;margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 16px;font-size:22px;text-align:center;direction:rtl;">تذكير بتجديد الاشتراك</h2>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">مرحباً {{params.venue_name}}،</p>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">ينتهي اشتراكك بتاريخ <strong>{{params.ends_at}}</strong> (متبقي تقريباً {{params.days_left}} يوم).</p>
                <p dir="rtl" style="margin:0 0 18px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">جدّد الآن حتى تستمر الأجهزة واللوحة بدون انقطاع.</p>
                <div style="text-align:center;margin:22px 0;">
                  <a href="{{params.support_url}}" style="display:inline-block;background:#9b6a2f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">تواصل للتجديد</a>
                </div>
                <p dir="rtl" style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;direction:rtl;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  'renewal_confirmed',
  'email',
  'ar',
  'تم تأكيد تجديد اشتراكك — Meez',
  $brevo$<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;color:#1f1a16;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
                <div style="text-align:center;margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 16px;font-size:22px;text-align:center;direction:rtl;">تم تأكيد التجديد</h2>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">مرحباً {{params.venue_name}}،</p>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">تم تجديد اشتراكك بنجاح.</p>
                <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;margin:0 0 18px;">
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">الحالة: {{params.status}}</td></tr>
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">تاريخ الانتهاء الجديد: {{params.ends_at}}</td></tr>
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">حد الأجهزة: {{params.device_limit}}</td></tr>
                </table>
                <div style="text-align:center;margin:22px 0;">
                  <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">لوحة التحكم</a>
                </div>
                <p dir="rtl" style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;direction:rtl;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  'subscription_confirmed',
  'email',
  'ar',
  'تم تأكيد اشتراكك — Meez',
  $brevo$<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;color:#1f1a16;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
                <div style="text-align:center;margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 16px;font-size:22px;text-align:center;direction:rtl;">تم تأكيد الاشتراك</h2>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">مرحباً {{params.venue_name}}،</p>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">تم تفعيل اشتراكك في Meez بنجاح.</p>
                <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;margin:0 0 18px;">
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">تاريخ البداية: {{params.starts_at}}</td></tr>
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">تاريخ الانتهاء: {{params.ends_at}}</td></tr>
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">حد الأجهزة: {{params.device_limit}}</td></tr>
                </table>
                <div style="text-align:center;margin:22px 0;">
                  <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">ابدأ الآن</a>
                </div>
                <p dir="rtl" style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;direction:rtl;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES (
  'subscription_extended',
  'email',
  'ar',
  'تم تمديد اشتراكك — Meez',
  $brevo$<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f7f3ec;font-family:Tahoma,Arial,sans-serif;color:#1f1a16;direction:rtl;text-align:right;">
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;background:#f7f3ec;">
      <tr>
        <td align="center" dir="rtl" style="padding:24px;direction:rtl;">
          <table role="presentation" dir="rtl" width="520" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;max-width:520px;width:100%;background:#ffffff;border-radius:20px;">
            <tr>
              <td dir="rtl" style="padding:28px;direction:rtl;text-align:right;">
                <div style="text-align:center;margin-bottom:18px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</span>
                </div>
                <h2 dir="rtl" style="margin:0 0 16px;font-size:22px;text-align:center;direction:rtl;">تم تمديد الاشتراك</h2>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">مرحباً {{params.venue_name}}،</p>
                <p dir="rtl" style="margin:0 0 12px;line-height:1.8;font-size:15px;direction:rtl;text-align:right;">تم تمديد اشتراكك بنجاح.</p>
                <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" style="direction:rtl;margin:0 0 18px;">
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">أيام التمديد: {{params.extended_days}}</td></tr>
                  <tr><td dir="rtl" style="padding:4px 0;direction:rtl;text-align:right;font-size:15px;line-height:1.8;">تاريخ الانتهاء الجديد: {{params.ends_at}}</td></tr>
                </table>
                <div style="text-align:center;margin:22px 0;">
                  <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">لوحة التحكم</a>
                </div>
                <p dir="rtl" style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;direction:rtl;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$brevo$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();
COMMIT;