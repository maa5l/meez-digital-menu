-- ============================================================
-- ROLLBACK: 20260613120000_security_critical_rpc_rls.sql
-- Restores pre-migration RPC grants and anon RLS policies.
-- WARNING: Re-opens C1–C4 vulnerabilities. Use only for emergency rollback.
-- Does NOT remove profiles created by backfill (safe to keep).
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- Restore C1 — RPC grants (matches state before security migration)
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
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

    IF r.proname = 'process_billing_webhook' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    ELSIF r.proname = 'resolve_subscription_access' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    ELSE
      -- Pre-migration insecure state (anon + authenticated)
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- Restore C2 — venues anon policies (20260531170000_realtime)
-- ────────────────────────────────────────────────────────────

GRANT SELECT ON TABLE public.venues TO anon;

DROP POLICY IF EXISTS "device_activations_select_anon_kiosk" ON public.device_activations;

CREATE POLICY "device_activations_select_anon_kiosk"
  ON public.device_activations FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "venues_select_anon_kiosk" ON public.venues;
CREATE POLICY "venues_select_anon_kiosk"
  ON public.venues FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.device_activations da
      WHERE da.owner_id = venues.owner_id
        AND da.status = 'active'::public.device_license_status
    )
  );

-- C3 backfill: intentionally no rollback (profiles remain)

COMMIT;
