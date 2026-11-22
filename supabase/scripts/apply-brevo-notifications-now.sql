-- Apply Brevo notification pipeline + templates NOW
-- Run in Supabase SQL Editor

-- Brevo notification pipeline: enqueue helpers + hooks on activate/extend/welcome

CREATE OR REPLACE FUNCTION public.render_notification_body(
  p_body text,
  p_params jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result text := COALESCE(p_body, '');
  r record;
BEGIN
  IF p_params IS NULL OR p_params = '{}'::jsonb THEN
    RETURN v_result;
  END IF;

  FOR r IN SELECT key, value FROM jsonb_each_text(p_params)
  LOOP
    v_result := replace(v_result, '{{params.' || r.key || '}}', COALESCE(r.value, ''));
    v_result := replace(v_result, '{{' || r.key || '}}', COALESCE(r.value, ''));
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_owner_notification(
  p_owner_id uuid,
  p_template_key text,
  p_params jsonb DEFAULT '{}'::jsonb,
  p_scheduled_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
  v_venue text;
  v_tpl public.notification_templates%ROWTYPE;
  v_params jsonb;
  v_id uuid;
  v_app_url text := COALESCE(
    NULLIF(current_setting('app.settings.app_url', true), ''),
    'https://bymeez.com'
  );
BEGIN
  IF p_owner_id IS NULL OR NULLIF(trim(p_template_key), '') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.email, p.full_name, p.venue_name
  INTO v_email, v_name, v_venue
  FROM public.profiles p
  WHERE p.id = p_owner_id;

  IF v_email IS NULL OR position('@' in v_email) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_tpl
  FROM public.notification_templates t
  WHERE t.template_key = p_template_key
    AND t.channel = 'email'
    AND t.locale = 'ar'
    AND t.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_params := COALESCE(p_params, '{}'::jsonb)
    || jsonb_build_object(
      'email', v_email,
      'full_name', COALESCE(v_name, v_venue, 'عميل Meez'),
      'venue_name', COALESCE(NULLIF(v_venue, ''), NULLIF(v_name, ''), 'منشأتك'),
      'dashboard_url', v_app_url || '/dashboard',
      'support_url', v_app_url || '/dashboard/subscription',
      'app_url', v_app_url
    );

  -- تجنب تكرار نفس القالب لنفس المالك خلال ساعة (ما عدا password_reset)
  IF p_template_key <> 'password_reset' THEN
    IF EXISTS (
      SELECT 1
      FROM public.notification_outbox o
      WHERE o.owner_id = p_owner_id
        AND o.template_key = p_template_key
        AND o.created_at > now() - interval '1 hour'
        AND o.status IN ('pending', 'queued', 'sent', 'delivered')
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.notification_outbox (
    owner_id,
    channel,
    template_key,
    to_address,
    subject,
    body,
    status,
    scheduled_at,
    metadata
  )
  VALUES (
    p_owner_id,
    'email',
    p_template_key,
    v_email,
    public.render_notification_body(v_tpl.subject, v_params),
    public.render_notification_body(v_tpl.body, v_params),
    'pending',
    COALESCE(p_scheduled_at, now()),
    jsonb_build_object(
      'params', v_params,
      'to_name', COALESCE(v_venue, v_name)
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_owner_notification(uuid, text, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_owner_notification(uuid, text, jsonb, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_renewal_reminders(
  p_days_ahead integer DEFAULT 7
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_id uuid;
  v_days integer;
  v_ends date;
BEGIN
  IF p_days_ahead IS NULL OR p_days_ahead < 1 THEN
    p_days_ahead := 7;
  END IF;

  FOR r IN
    SELECT
      s.owner_id,
      s.subscription_ends_at,
      s.device_limit,
      s.status
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND s.subscription_ends_at IS NOT NULL
      AND s.subscription_ends_at::date BETWEEN CURRENT_DATE
        AND (CURRENT_DATE + make_interval(days => p_days_ahead))
  LOOP
    v_ends := r.subscription_ends_at::date;
    v_days := GREATEST((v_ends - CURRENT_DATE), 0);

    -- تذكير واحد لكل تاريخ انتهاء
    IF EXISTS (
      SELECT 1
      FROM public.notification_outbox o
      WHERE o.owner_id = r.owner_id
        AND o.template_key = 'renewal_reminder'
        AND o.created_at > now() - interval '6 days'
        AND COALESCE(o.metadata->'params'->>'ends_at', '') = to_char(v_ends, 'YYYY-MM-DD')
    ) THEN
      CONTINUE;
    END IF;

    v_id := public.enqueue_owner_notification(
      r.owner_id,
      'renewal_reminder',
      jsonb_build_object(
        'ends_at', to_char(v_ends, 'YYYY-MM-DD'),
        'days_left', v_days::text,
        'device_limit', COALESCE(r.device_limit, 1)::text,
        'status', r.status::text
      )
    );

    IF v_id IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_renewal_reminders(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_renewal_reminders(integer) TO service_role;

-- Hook: welcome عند بدء التجربة لأول مرة
CREATE OR REPLACE FUNCTION public.ensure_subscription_for_owner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
  v_new_owner UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.subscriptions (
    owner_id,
    status,
    screen_count,
    device_limit,
    trial_started_at,
    trial_ends_at,
    manual_activation
  )
  VALUES (
    v_uid,
    'trial',
    1,
    1,
    v_now,
    v_now + INTERVAL '7 days',
    false
  )
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING owner_id INTO v_new_owner;

  IF v_new_owner IS NOT NULL THEN
    PERFORM public.write_audit_log(
      v_uid,
      'subscription.trial_started',
      jsonb_build_object('trial_ends_at', v_now + INTERVAL '7 days')
    );
    PERFORM public.enqueue_owner_notification(
      v_uid,
      'welcome',
      jsonb_build_object('trial_days', '7')
    );
  END IF;
END;
$$;

-- Hook: تأكيد اشتراك / تجديد / تمديد عند إجراءات الأدمن
CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  p_owner_id UUID,
  p_action TEXT,
  p_device_limit INT DEFAULT NULL,
  p_subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  s_prev public.subscriptions%ROWTYPE;
  s_new public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_ends TIMESTAMPTZ;
  v_template text;
  v_extended_days integer;
BEGIN
  PERFORM public.admin_require_role('admin');

  SELECT * INTO s_prev FROM public.subscriptions WHERE owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_not_found');
  END IF;

  IF p_internal_notes IS NOT NULL THEN
    BEGIN
      UPDATE public.profiles SET internal_notes = p_internal_notes WHERE id = p_owner_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  v_ends := CASE
    WHEN p_subscription_ends_at IS NULL THEN NULL
    ELSE (p_subscription_ends_at::date + TIME '23:59:59') AT TIME ZONE 'UTC'
  END;

  CASE p_action
    WHEN 'activate' THEN
      UPDATE public.subscriptions SET
        status = 'active',
        manual_activation = true,
        activated_by = v_admin,
        activated_at = v_now,
        subscription_started_at = COALESCE(subscription_started_at, v_now),
        subscription_ends_at = COALESCE(v_ends, subscription_ends_at, v_now + INTERVAL '365 days'),
        device_limit = COALESCE(p_device_limit, device_limit, screen_count, 1),
        screen_count = COALESCE(p_device_limit, device_limit, screen_count, 1),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

      IF s_prev.status::text IN ('expired', 'canceled', 'suspended') THEN
        v_template := 'renewal_confirmed';
      ELSE
        v_template := 'subscription_confirmed';
      END IF;

      PERFORM public.enqueue_owner_notification(
        p_owner_id,
        v_template,
        jsonb_build_object(
          'status', s_new.status::text,
          'starts_at', to_char(COALESCE(s_new.subscription_started_at, v_now), 'YYYY-MM-DD'),
          'ends_at', to_char(COALESCE(s_new.subscription_ends_at, v_now), 'YYYY-MM-DD'),
          'device_limit', COALESCE(s_new.device_limit, 1)::text
        )
      );

    WHEN 'suspend' THEN
      UPDATE public.subscriptions SET
        status = 'suspended',
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'disable' THEN
      UPDATE public.subscriptions SET
        status = 'canceled',
        canceled_at = v_now,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'extend' THEN
      IF v_ends IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'subscription_ends_at_required');
      END IF;
      UPDATE public.subscriptions SET
        status = 'active',
        subscription_started_at = COALESCE(subscription_started_at, v_now),
        subscription_ends_at = v_ends,
        manual_activation = true,
        activated_by = COALESCE(activated_by, v_admin),
        activated_at = COALESCE(activated_at, v_now),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

      v_extended_days := GREATEST(
        (v_ends::date - COALESCE(s_prev.subscription_ends_at, v_now)::date),
        0
      );

      PERFORM public.enqueue_owner_notification(
        p_owner_id,
        'subscription_extended',
        jsonb_build_object(
          'extended_days', v_extended_days::text,
          'ends_at', to_char(v_ends, 'YYYY-MM-DD'),
          'device_limit', COALESCE(s_new.device_limit, 1)::text,
          'status', s_new.status::text
        )
      );

    WHEN 'reset_trial' THEN
      UPDATE public.subscriptions SET
        status = 'trial',
        trial_started_at = v_now,
        trial_ends_at = v_now + INTERVAL '7 days',
        manual_activation = false,
        activated_by = NULL,
        activated_at = NULL,
        subscription_started_at = NULL,
        subscription_ends_at = NULL,
        device_limit = COALESCE(p_device_limit, 1),
        screen_count = COALESCE(p_device_limit, 1),
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    WHEN 'set_device_limit' THEN
      IF p_device_limit IS NULL OR p_device_limit < 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_device_limit');
      END IF;
      UPDATE public.subscriptions SET
        device_limit = p_device_limit,
        screen_count = p_device_limit,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'unknown_action');
  END CASE;

  RETURN jsonb_build_object(
    'ok', true,
    'status', s_new.status::text,
    'subscription_ends_at', s_new.subscription_ends_at,
    'access', CASE
      WHEN to_regprocedure('public.resolve_subscription_access(uuid)') IS NOT NULL
        THEN public.resolve_subscription_access(p_owner_id)
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_subscription_for_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_subscription_for_owner() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_subscription_for_owner() TO authenticated;


-- ===== TEMPLATES =====

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
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;text-align:center;">
      <div style="margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;">إعادة تعيين كلمة المرور</h2>
      <p style="margin:0 0 20px;color:#6b6259;line-height:1.7;">طلبت إعادة تعيين كلمة المرور لحساب {{params.email}}. استخدم الرمز التالي:</p>
      <div style="direction:ltr;letter-spacing:10px;font-size:36px;font-weight:800;color:#9b6a2f;margin:18px 0;">
        {{params.otp_code}}
      </div>
      <p style="margin:20px 0 0;color:#8a8178;font-size:13px;">إذا لم تطلب ذلك، تجاهل الرسالة. الرمز ينتهي خلال دقائق.</p>
    </div>
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
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;text-align:center;">أهلاً بك في Meez</h2>
      <p style="margin:0 0 12px;line-height:1.7;">مرحباً {{params.venue_name}}،</p>
      <p style="margin:0 0 12px;line-height:1.7;">تم إنشاء حسابك بنجاح. يمكنك الآن تجهيز منيوك الرقمي وإضافة المنتجات والأجهزة.</p>
      <p style="margin:0 0 18px;line-height:1.7;">بدأت معك فترة تجربة مجانية لمدة {{params.trial_days}} أيام.</p>
      <div style="text-align:center;margin:22px 0;">
        <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">افتح لوحة التحكم</a>
      </div>
      <p style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
    </div>
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
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;text-align:center;">تذكير بتجديد الاشتراك</h2>
      <p style="margin:0 0 12px;line-height:1.7;">مرحباً {{params.venue_name}}،</p>
      <p style="margin:0 0 12px;line-height:1.7;">ينتهي اشتراكك بتاريخ <strong>{{params.ends_at}}</strong> (متبقي تقريباً {{params.days_left}} يوم).</p>
      <p style="margin:0 0 18px;line-height:1.7;">جدّد الآن حتى تستمر الأجهزة واللوحة بدون انقطاع.</p>
      <div style="text-align:center;margin:22px 0;">
        <a href="{{params.support_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">تواصل للتجديد</a>
      </div>
      <p style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
    </div>
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
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;text-align:center;">تم تأكيد التجديد</h2>
      <p style="margin:0 0 12px;line-height:1.7;">مرحباً {{params.venue_name}}،</p>
      <p style="margin:0 0 12px;line-height:1.7;">تم تجديد اشتراكك بنجاح.</p>
      <ul style="padding-right:18px;line-height:1.8;margin:0 0 18px;">
        <li>الحالة: {{params.status}}</li>
        <li>تاريخ الانتهاء الجديد: {{params.ends_at}}</li>
        <li>حد الأجهزة: {{params.device_limit}}</li>
      </ul>
      <div style="text-align:center;margin:22px 0;">
        <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">لوحة التحكم</a>
      </div>
      <p style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
    </div>
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
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;text-align:center;">تم تأكيد الاشتراك</h2>
      <p style="margin:0 0 12px;line-height:1.7;">مرحباً {{params.venue_name}}،</p>
      <p style="margin:0 0 12px;line-height:1.7;">تم تفعيل اشتراكك في Meez بنجاح.</p>
      <ul style="padding-right:18px;line-height:1.8;margin:0 0 18px;">
        <li>تاريخ البداية: {{params.starts_at}}</li>
        <li>تاريخ الانتهاء: {{params.ends_at}}</li>
        <li>حد الأجهزة: {{params.device_limit}}</li>
      </ul>
      <div style="text-align:center;margin:22px 0;">
        <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">ابدأ الآن</a>
      </div>
      <p style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
    </div>
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
  <body style="margin:0;padding:24px;background:#f7f3ec;font-family:Arial,Tahoma,sans-serif;color:#1f1a16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#f1e7da;color:#9b6a2f;font-size:13px;font-weight:700;">Meez</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:22px;text-align:center;">تم تمديد الاشتراك</h2>
      <p style="margin:0 0 12px;line-height:1.7;">مرحباً {{params.venue_name}}،</p>
      <p style="margin:0 0 12px;line-height:1.7;">تم تمديد اشتراكك بنجاح.</p>
      <ul style="padding-right:18px;line-height:1.8;margin:0 0 18px;">
        <li>أيام التمديد: {{params.extended_days}}</li>
        <li>تاريخ الانتهاء الجديد: {{params.ends_at}}</li>
      </ul>
      <div style="text-align:center;margin:22px 0;">
        <a href="{{params.dashboard_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">لوحة التحكم</a>
      </div>
      <p style="margin:24px 0 0;color:#8a8178;font-size:12px;text-align:center;">هذه رسالة تلقائية من منصة Meez للمنيو الرقمي.</p>
    </div>
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
