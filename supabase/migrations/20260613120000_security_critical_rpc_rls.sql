-- ============================================================
-- Security: Critical fixes C1–C4 (production-safe)
-- C1) Lock sensitive RPCs to service_role only
-- C2) Remove / tighten anon RLS on device_activations & venues
-- C3) Backfill missing profiles for auth.users
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- C1 — Sensitive RPCs: service_role ONLY
-- Internal SECURITY DEFINER calls (e.g. check_kiosk_access →
-- resolve_subscription_access) remain valid via function owner.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'process_billing_webhook',
        'deactivate_all_devices_for_owner',
        'refresh_subscription_state',
        'write_audit_log',
        'resolve_subscription_access'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- C2 — RLS: remove permissive anon access to venues (menu JSONB)
-- Kiosk reads venue data via get_venue_for_device (RPC + gate).
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "venues_select_anon_kiosk" ON public.venues;
DROP POLICY IF EXISTS "venues_anon_kiosk_select" ON public.venues;

-- Belt-and-suspenders: no direct table SELECT for anon on venues
REVOKE SELECT ON TABLE public.venues FROM anon;

-- ────────────────────────────────────────────────────────────
-- C2 — RLS: replace device_activations anon USING (true)
-- Keeps Realtime postgres_changes for kiosk (code filter in client).
-- Blocks REST full-table scrape; anon still needs row-level SELECT
-- for subscribed device code only (Realtime filter + RLS).
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;
DROP POLICY IF EXISTS "device_activations_anon_kiosk_select" ON public.device_activations;

CREATE POLICY "device_activations_select_anon_kiosk"
  ON public.device_activations
  FOR SELECT
  TO anon
  USING (
    upper(trim(code)) ~ '^QM-[A-HJ-NP-Z2-9]{4}$'
  );

-- ────────────────────────────────────────────────────────────
-- C3 — Backfill profiles for auth users without a profile row
-- ────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, venue_name, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'venue_name', '')), ''),
  'owner'
FROM auth.users u
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
