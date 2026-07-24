-- إصلاح/إنشاء طبقة الاشتراك — شغّل كاملاً في SQL Editor
-- يعمل حتى لو جدول subscriptions غير موجود

BEGIN;

-- ── تشخيص سريع (نتائج في Notices) ─────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'schemas tables: %', (
    SELECT string_agg(tablename, ', ' ORDER BY tablename)
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename ILIKE '%subscr%'
  );
  RAISE NOTICE 'profiles exists: %', to_regclass('public.profiles') IS NOT NULL;
END $$;

-- ── أنواع ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'trial', 'active', 'past_due', 'grace_period', 'suspended', 'expired', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── جدول الاشتراكات ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'trial',
  screen_count INT NOT NULL DEFAULT 1 CHECK (screen_count >= 0),
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  price_per_screen_monthly NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
  price_per_screen_yearly NUMERIC(10, 2) NOT NULL DEFAULT 450.00,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- أعمدة الإدارة اليدوية
  trial_started_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  activated_by UUID,
  activated_at TIMESTAMPTZ,
  manual_activation BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  device_limit INT
);

-- أعمدة إضافية إن كان الجدول قديماً بدونها
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_activation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS device_limit INT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS screen_count INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- تأكد أن status من نوع الـ enum
DO $$
DECLARE
  v_udt TEXT;
BEGIN
  SELECT c.udt_name INTO v_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'subscriptions'
    AND c.column_name = 'status';

  IF v_udt IS NULL THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN status public.subscription_status NOT NULL DEFAULT 'trial';
  ELSIF v_udt IN ('text', 'varchar') THEN
    ALTER TABLE public.subscriptions ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.subscriptions
      ALTER COLUMN status TYPE public.subscription_status
      USING status::public.subscription_status;
    ALTER TABLE public.subscriptions
      ALTER COLUMN status SET DEFAULT 'trial'::public.subscription_status;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- صف اشتراك لكل بروفايل موجود (بدون الكتابة)
INSERT INTO public.subscriptions (
  owner_id,
  status,
  screen_count,
  device_limit,
  trial_started_at,
  trial_ends_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  'trial'::public.subscription_status,
  1,
  1,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.owner_id = p.id
)
ON CONFLICT (owner_id) DO NOTHING;

-- ── دوال مساعدة مبسّطة ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.subscription_device_limit(p_sub public.subscriptions)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(0, COALESCE(p_sub.device_limit, p_sub.screen_count, 1));
$$;

DROP FUNCTION IF EXISTS public.refresh_subscription_state(UUID);

CREATE OR REPLACE FUNCTION public.refresh_subscription_state(p_owner_id UUID)
RETURNS public.subscription_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE owner_id = p_owner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- تجربة منتهية + تاريخ اشتراك مستقبلي → active
  IF s.status = 'trial'
     AND s.trial_ends_at IS NOT NULL
     AND s.trial_ends_at < v_now
  THEN
    IF s.subscription_ends_at IS NOT NULL AND s.subscription_ends_at > v_now THEN
      UPDATE public.subscriptions
      SET
        status = 'active',
        manual_activation = true,
        subscription_started_at = COALESCE(subscription_started_at, v_now),
        updated_at = v_now
      WHERE owner_id = p_owner_id
      RETURNING * INTO s;
      RETURN 'active'::public.subscription_status;
    END IF;

    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id;
    RETURN 'expired'::public.subscription_status;
  END IF;

  -- اشتراك نشط انتهى
  IF s.status = 'active'
     AND s.subscription_ends_at IS NOT NULL
     AND s.subscription_ends_at < v_now
  THEN
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = v_now
    WHERE owner_id = p_owner_id;
    RETURN 'expired'::public.subscription_status;
  END IF;

  -- منتهٍ وله تاريخ ساري → أعد التفعيل
  IF s.status = 'expired'
     AND s.subscription_ends_at IS NOT NULL
     AND s.subscription_ends_at > v_now
  THEN
    UPDATE public.subscriptions
    SET
      status = 'active',
      manual_activation = true,
      subscription_started_at = COALESCE(subscription_started_at, v_now),
      updated_at = v_now
    WHERE owner_id = p_owner_id;
    RETURN 'active'::public.subscription_status;
  END IF;

  RETURN s.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_subscription_state(UUID) TO authenticated;

-- ── تحديث admin_update_subscription إن وُجدت صلاحيات الأدمن ─
DO $$
BEGIN
  IF to_regprocedure('public.admin_require_role(text)') IS NULL THEN
    RAISE NOTICE 'تخطي admin_update_subscription — admin_require_role غير موجودة';
    RETURN;
  END IF;

  EXECUTE $fn$
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
  AS $body$
  DECLARE
    v_admin UUID := auth.uid();
    s_prev public.subscriptions%ROWTYPE;
    s_new public.subscriptions%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_ends TIMESTAMPTZ;
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
  $body$;
  $fn$;

  REVOKE ALL ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, TEXT, INT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
END $$;

-- إصلاح الحسابات ذات تاريخ مستقبلي وحالة خاطئة
UPDATE public.subscriptions s
SET
  status = 'active',
  manual_activation = true,
  subscription_started_at = COALESCE(s.subscription_started_at, NOW()),
  updated_at = NOW()
WHERE s.subscription_ends_at IS NOT NULL
  AND s.subscription_ends_at > NOW()
  AND s.status::text IN ('trial', 'expired');

COMMIT;

-- تحقق سريع بعد التنفيذ:
-- SELECT owner_id, status, trial_ends_at, subscription_ends_at, manual_activation
-- FROM public.subscriptions
-- ORDER BY updated_at DESC
-- LIMIT 20;
