-- =============================================================================
-- 202607250011 — Views + materialized views for admin/reporting
-- Ensures device_activations.status exists (older DBs may lack it)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.device_license_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Older Meez DBs created device_activations without status
ALTER TABLE public.device_activations
  ADD COLUMN IF NOT EXISTS status public.device_license_status;

-- Backfill then enforce default (safe if column already populated)
UPDATE public.device_activations
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.device_activations
  ALTER COLUMN status SET DEFAULT 'active';

DO $$
BEGIN
  ALTER TABLE public.device_activations
    ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'device_activations.status NOT NULL skipped: %', SQLERRM;
END $$;

CREATE OR REPLACE VIEW public.v_owner_catalog_counts
WITH (security_invoker = true)
AS
SELECT
  p.id AS owner_id,
  p.venue_name,
  (SELECT count(*) FROM public.menu_categories c WHERE c.owner_id = p.id AND c.deleted_at IS NULL) AS category_count,
  (SELECT count(*) FROM public.menu_products pr WHERE pr.owner_id = p.id AND pr.deleted_at IS NULL) AS product_count,
  (SELECT count(*) FROM public.menu_crops cr WHERE cr.owner_id = p.id AND cr.deleted_at IS NULL) AS crop_count,
  (SELECT count(*) FROM public.media_assets m WHERE m.owner_id = p.id AND m.deleted_at IS NULL) AS media_count,
  (SELECT count(*) FROM public.device_activations d WHERE d.owner_id = p.id AND d.status = 'active') AS active_device_count
FROM public.profiles p;

COMMENT ON VIEW public.v_owner_catalog_counts IS
  'Per-owner catalog/media/device counts (normalized tables)';

CREATE OR REPLACE VIEW public.v_media_ready
WITH (security_invoker = true)
AS
SELECT
  m.*,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'role', v.role,
        'breakpoint', v.breakpoint,
        'format', v.format,
        'pixel_density', v.pixel_density,
        'public_url', v.public_url,
        'width', v.width,
        'height', v.height
      )
      ORDER BY v.pixel_density, v.format
    )
    FROM public.media_variants v
    WHERE v.asset_id = m.id AND v.deleted_at IS NULL
  ) AS variants
FROM public.media_assets m
WHERE m.deleted_at IS NULL
  AND m.status = 'ready';

-- Materialized admin rollup (skip/replace safely)
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_platform_stats;

CREATE MATERIALIZED VIEW public.mv_admin_platform_stats AS
SELECT
  (SELECT count(*) FROM public.profiles) AS total_owners,
  (SELECT count(*) FROM public.subscriptions s WHERE s.status::text = 'trial') AS trial_count,
  (SELECT count(*) FROM public.subscriptions s WHERE s.status::text = 'active') AS active_count,
  (SELECT count(*) FROM public.subscriptions s WHERE s.status::text = 'expired') AS expired_count,
  (SELECT count(*) FROM public.device_activations d WHERE d.status = 'active') AS active_devices,
  (SELECT count(*) FROM public.media_assets WHERE deleted_at IS NULL) AS media_assets_total,
  (SELECT coalesce(sum(file_size), 0) FROM public.media_assets WHERE deleted_at IS NULL) AS media_bytes_total,
  now() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_platform_stats_singleton
  ON public.mv_admin_platform_stats ((true));

CREATE OR REPLACE FUNCTION public.refresh_admin_platform_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_platform_stats;
END;
$$;
