-- إشعارات إدارة المنصة: تسجيل جديد / توقف / تجديد + تقرير دوري

CREATE TABLE IF NOT EXISTS public.admin_alert_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  receive_instant boolean NOT NULL DEFAULT true,
  receive_digest boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_alert_recipients (email, name)
VALUES ('mohammed.m.harmoush@gmail.com', 'Mohammed Harmoush')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  receive_instant = true,
  receive_digest = true;

ALTER TABLE public.admin_alert_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_alert_recipients_admin_all ON public.admin_alert_recipients;
CREATE POLICY admin_alert_recipients_admin_all
  ON public.admin_alert_recipients
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO public.notification_templates (template_key, channel, locale, subject, body, is_active)
VALUES
(
  'admin_alert',
  'email',
  'ar',
  'تنبيه منصة Meez: {{params.title}}',
  $tpl$<!doctype html><html lang="ar" dir="rtl"><body dir="rtl" style="margin:0;padding:24px;background:#f4f1ec;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;"><div style="text-align:center;margin-bottom:12px;"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background:#1f1a16;color:#f7f3ec;font-size:12px;font-weight:700;">Meez Admin</span></div><h2 style="margin:0 0 8px;text-align:center;">{{params.title}}</h2><p style="margin:0 0 14px;color:#6b6259;text-align:center;font-size:13px;">{{params.event_label}} · {{params.occurred_at}}</p><div style="padding:14px 16px;background:#f7f3ec;border-radius:14px;line-height:1.8;">{{params.details_html}}</div><div style="text-align:center;margin-top:18px;"><a href="{{params.admin_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;">لوحة الإدارة</a></div></div></body></html>$tpl$,
  true
),
(
  'admin_digest',
  'email',
  'ar',
  'تقرير Meez الدوري — آخر {{params.hours}} ساعة',
  $tpl$<!doctype html><html lang="ar" dir="rtl"><body dir="rtl" style="margin:0;padding:24px;background:#f4f1ec;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;"><div style="text-align:center;margin-bottom:12px;"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background:#1f1a16;color:#f7f3ec;font-size:12px;font-weight:700;">Meez Admin</span></div><h2 style="margin:0 0 6px;text-align:center;">تقرير المنصة الدوري</h2><p style="margin:0 0 16px;color:#6b6259;text-align:center;font-size:13px;">آخر {{params.hours}} ساعة · {{params.generated_at}}</p><p style="margin:0 0 8px;"><strong>تسجيل جديد:</strong> {{params.new_registrations}} | <strong>قرب الانتهاء:</strong> {{params.expiring_soon}} | <strong>منتهي/موقوف:</strong> {{params.expired_or_stopped}} | <strong>تجديد/تمديد:</strong> {{params.renewal_events}}</p><h3>التسجيلات</h3><div style="padding:12px;background:#faf7f2;border-radius:12px;margin-bottom:12px;">{{params.registrations_html}}</div><h3>تنبيهات وتوقف</h3><div style="padding:12px;background:#faf7f2;border-radius:12px;margin-bottom:12px;">{{params.alerts_html}}</div><h3>تجديد</h3><div style="padding:12px;background:#faf7f2;border-radius:12px;margin-bottom:12px;">{{params.renewals_html}}</div><div style="text-align:center;margin-top:16px;"><a href="{{params.admin_url}}" style="display:inline-block;background:#9b6a2f;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;">لوحة الإدارة</a></div></div></body></html>$tpl$,
  true
)
ON CONFLICT (template_key, channel, locale) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.enqueue_admin_alert(
  p_event_key text,
  p_title text,
  p_event_label text,
  p_details_html text,
  p_params jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_tpl public.notification_templates%ROWTYPE;
  v_params jsonb;
  v_count integer := 0;
  v_app_url text := COALESCE(
    NULLIF(current_setting('app.settings.app_url', true), ''),
    'https://bymeez.com'
  );
BEGIN
  SELECT * INTO v_tpl
  FROM public.notification_templates
  WHERE template_key = 'admin_alert' AND channel = 'email' AND locale = 'ar' AND is_active
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_params := COALESCE(p_params, '{}'::jsonb) || jsonb_build_object(
    'title', COALESCE(p_title, p_event_key),
    'event_label', COALESCE(p_event_label, p_event_key),
    'details_html', COALESCE(p_details_html, '—'),
    'occurred_at', to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'),
    'admin_url', v_app_url || '/admin',
    'event_key', p_event_key
  );

  FOR r IN
    SELECT email, name
    FROM public.admin_alert_recipients
    WHERE is_active AND receive_instant
  LOOP
    INSERT INTO public.notification_outbox (
      owner_id, channel, template_key, to_address, subject, body, status, scheduled_at, metadata
    ) VALUES (
      NULL,
      'email',
      'admin_alert',
      r.email,
      public.render_notification_body(v_tpl.subject, v_params),
      public.render_notification_body(v_tpl.body, v_params),
      'pending',
      now(),
      jsonb_build_object('params', v_params, 'to_name', COALESCE(r.name, 'Admin'), 'admin_event', p_event_key)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_admin_alert(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_admin_alert(text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_admin_alert(text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_admin_digest(
  p_hours integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_tpl public.notification_templates%ROWTYPE;
  v_params jsonb;
  v_count integer := 0;
  v_since timestamptz := now() - make_interval(hours => GREATEST(COALESCE(p_hours, 24), 1));
  v_new_reg integer;
  v_expiring integer;
  v_stopped integer;
  v_renewals integer;
  v_reg_html text;
  v_alerts_html text;
  v_renew_html text;
  v_app_url text := COALESCE(
    NULLIF(current_setting('app.settings.app_url', true), ''),
    'https://bymeez.com'
  );
BEGIN
  SELECT * INTO v_tpl
  FROM public.notification_templates
  WHERE template_key = 'admin_digest' AND channel = 'email' AND locale = 'ar' AND is_active
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_new_reg
  FROM public.profiles p
  WHERE p.created_at >= v_since;

  SELECT COUNT(*) INTO v_expiring
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND s.subscription_ends_at IS NOT NULL
    AND s.subscription_ends_at::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7);

  SELECT COUNT(*) INTO v_stopped
  FROM public.subscriptions s
  WHERE s.status::text IN ('expired', 'suspended', 'canceled')
    AND s.updated_at >= v_since;

  SELECT COUNT(*) INTO v_renewals
  FROM public.audit_logs a
  WHERE a.created_at >= v_since
    AND a.action IN (
      'subscription.activated',
      'subscription.extended',
      'subscription.renewed',
      'admin.subscription.activate',
      'admin.subscription.extend'
    );

  SELECT COALESCE(string_agg(
    '<div style="margin:0 0 8px;">• ' ||
    COALESCE(NULLIF(p.venue_name, ''), NULLIF(p.full_name, ''), 'منشأة') ||
    ' — ' || p.email ||
    ' <span style="color:#8a8178">(' || to_char(p.created_at AT TIME ZONE 'Asia/Riyadh', 'MM-DD HH24:MI') || ')</span></div>',
    ''
  ), '<div style="color:#8a8178;">لا تسجيلات جديدة</div>')
  INTO v_reg_html
  FROM (
    SELECT venue_name, full_name, email, created_at
    FROM public.profiles
    WHERE created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 30
  ) p;

  SELECT COALESCE(string_agg(
    '<div style="margin:0 0 8px;">• ' ||
    COALESCE(x.venue_name, x.email, x.owner_id::text) ||
    ' — ' || x.status ||
    CASE WHEN x.subscription_ends_at IS NOT NULL
      THEN ' (ينتهي ' || to_char(x.subscription_ends_at, 'YYYY-MM-DD') || ')'
      ELSE '' END ||
    '</div>',
    ''
  ), '<div style="color:#8a8178;">لا تنبيهات توقف في الفترة</div>')
  INTO v_alerts_html
  FROM (
    SELECT s.owner_id, s.status::text AS status, s.subscription_ends_at, pr.venue_name, pr.email
    FROM public.subscriptions s
    LEFT JOIN public.profiles pr ON pr.id = s.owner_id
    WHERE s.status::text IN ('expired', 'suspended', 'canceled')
      AND s.updated_at >= v_since
    ORDER BY s.updated_at DESC
    LIMIT 30
  ) x;

  SELECT COALESCE(string_agg(
    '<div style="margin:0 0 8px;">• ' || x.action ||
    ' — ' || COALESCE(x.email, x.owner_id::text, '—') ||
    ' <span style="color:#8a8178">(' || to_char(x.created_at AT TIME ZONE 'Asia/Riyadh', 'MM-DD HH24:MI') || ')</span></div>',
    ''
  ), '<div style="color:#8a8178;">لا عمليات تجديد</div>')
  INTO v_renew_html
  FROM (
    SELECT a.action, a.owner_id, a.created_at, pr.email
    FROM public.audit_logs a
    LEFT JOIN public.profiles pr ON pr.id = a.owner_id
    WHERE a.created_at >= v_since
      AND (
        a.action ILIKE '%renew%' OR a.action ILIKE '%extend%' OR a.action ILIKE '%activat%'
        OR a.action ILIKE '%تجديد%' OR a.action = 'subscription.trial_started'
      )
    ORDER BY a.created_at DESC
    LIMIT 30
  ) x;

  -- قرب الانتهاء كجزء من التنبيهات
  v_alerts_html := v_alerts_html || COALESCE((
    SELECT '<div style="margin:12px 0 0;font-weight:700;">قرب الانتهاء (7 أيام)</div>' ||
      string_agg(
        '<div style="margin:0 0 8px;">• ' || COALESCE(pr.venue_name, pr.email, s.owner_id::text) ||
        ' — ' || to_char(s.subscription_ends_at, 'YYYY-MM-DD') || '</div>',
        ''
      )
    FROM public.subscriptions s
    LEFT JOIN public.profiles pr ON pr.id = s.owner_id
    WHERE s.status = 'active'
      AND s.subscription_ends_at IS NOT NULL
      AND s.subscription_ends_at::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
  ), '');

  v_params := jsonb_build_object(
    'hours', GREATEST(COALESCE(p_hours, 24), 1)::text,
    'generated_at', to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'),
    'new_registrations', v_new_reg::text,
    'expiring_soon', v_expiring::text,
    'expired_or_stopped', v_stopped::text,
    'renewal_events', v_renewals::text,
    'registrations_html', v_reg_html,
    'alerts_html', COALESCE(NULLIF(v_alerts_html, ''), '<div style="color:#8a8178;">لا تنبيهات</div>'),
    'renewals_html', v_renew_html,
    'admin_url', v_app_url || '/admin'
  );

  FOR r IN
    SELECT email, name
    FROM public.admin_alert_recipients
    WHERE is_active AND receive_digest
  LOOP
    INSERT INTO public.notification_outbox (
      owner_id, channel, template_key, to_address, subject, body, status, scheduled_at, metadata
    ) VALUES (
      NULL,
      'email',
      'admin_digest',
      r.email,
      public.render_notification_body(v_tpl.subject, v_params),
      public.render_notification_body(v_tpl.body, v_params),
      'pending',
      now(),
      jsonb_build_object('params', v_params, 'to_name', COALESCE(r.name, 'Admin'), 'admin_event', 'digest')
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_admin_digest(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_admin_digest(integer) TO service_role;

-- تنبيه فوري عند تسجيل منشأة جديدة
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enqueue_admin_alert(
    'new_registration',
    'تسجيل جديد في Meez',
    'تسجيل حساب',
    '<div><strong>المنشأة:</strong> ' || COALESCE(NULLIF(NEW.venue_name, ''), '—') || '</div>' ||
    '<div><strong>الاسم:</strong> ' || COALESCE(NULLIF(NEW.full_name, ''), '—') || '</div>' ||
    '<div><strong>البريد:</strong> ' || COALESCE(NEW.email, '—') || '</div>' ||
    '<div><strong>الجوال:</strong> ' || COALESCE(to_jsonb(NEW)->>'phone', '—') || '</div>',
    jsonb_build_object('email', NEW.email, 'venue_name', COALESCE(NEW.venue_name, ''))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_new_profile ON public.profiles;
CREATE TRIGGER trg_notify_admin_on_new_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_new_profile();

-- اربط تنبيهات الإدارة بإجراءات الاشتراك
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
  v_profile public.profiles%ROWTYPE;
  v_details text;
BEGIN
  PERFORM public.admin_require_role('admin');

  SELECT * INTO s_prev FROM public.subscriptions WHERE owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_not_found');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_owner_id;

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

  v_details :=
    '<div><strong>المنشأة:</strong> ' || COALESCE(v_profile.venue_name, '—') || '</div>' ||
    '<div><strong>البريد:</strong> ' || COALESCE(v_profile.email, '—') || '</div>';

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

      PERFORM public.enqueue_admin_alert(
        CASE WHEN v_template = 'renewal_confirmed' THEN 'renewal_confirmed' ELSE 'subscription_activated' END,
        CASE WHEN v_template = 'renewal_confirmed' THEN 'تأكيد تجديد اشتراك' ELSE 'تفعيل اشتراك جديد' END,
        'اشتراكات',
        v_details || '<div><strong>الانتهاء:</strong> ' || to_char(COALESCE(s_new.subscription_ends_at, v_now), 'YYYY-MM-DD') || '</div>'
      );

    WHEN 'suspend' THEN
      UPDATE public.subscriptions SET
        status = 'suspended',
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

      PERFORM public.enqueue_admin_alert(
        'platform_stopped',
        'إيقاف منصة عميل',
        'توقف المنصة',
        v_details || '<div><strong>الإجراء:</strong> إيقاف (suspended)</div>'
      );

    WHEN 'disable' THEN
      UPDATE public.subscriptions SET
        status = 'canceled',
        canceled_at = v_now,
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s_new;

      PERFORM public.enqueue_admin_alert(
        'platform_canceled',
        'إلغاء اشتراك عميل',
        'توقف المنصة',
        v_details || '<div><strong>الإجراء:</strong> إلغاء (canceled)</div>'
      );

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

      PERFORM public.enqueue_admin_alert(
        'subscription_extended',
        'تمديد اشتراك',
        'تجديد/تمديد',
        v_details ||
        '<div><strong>أيام التمديد:</strong> ' || v_extended_days::text || '</div>' ||
        '<div><strong>الانتهاء الجديد:</strong> ' || to_char(v_ends, 'YYYY-MM-DD') || '</div>'
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
