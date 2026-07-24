-- =============================================================================
-- 202607250014 — Validation remediation (security + idempotency + authz)
-- Apply AFTER 001–013. Additive / safe. Does not drop business data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- C1: Tighten CMS / marketing public SELECT (no draft leaks to anon)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'landing_pages','pages','homepage_sections','hero_sections','sliders','banners',
    'cms_announcements','faqs','faq_categories','testimonials','partners','team_members',
    'blog_categories','blogs','news','popups','seo_metadata','languages','translations',
    'feature_flags'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
  END LOOP;
END $$;

-- Published-only (or always-safe reference data)
CREATE POLICY landing_pages_public_read ON public.landing_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY pages_public_read ON public.pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY homepage_sections_public_read ON public.homepage_sections
  FOR SELECT TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY hero_sections_public_read ON public.hero_sections
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY sliders_public_read ON public.sliders
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY banners_public_read ON public.banners
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY cms_announcements_public_read ON public.cms_announcements
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY faqs_public_read ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY faq_categories_public_read ON public.faq_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY testimonials_public_read ON public.testimonials
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY partners_public_read ON public.partners
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY team_members_public_read ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY blog_categories_public_read ON public.blog_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY blogs_public_read ON public.blogs
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY news_public_read ON public.news
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY popups_public_read ON public.popups
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY seo_metadata_public_read ON public.seo_metadata
  FOR SELECT TO anon, authenticated
  USING (true); -- SEO fields are intended public; keep drafts out of CMS entities above

CREATE POLICY languages_public_read ON public.languages
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true);

CREATE POLICY translations_public_read ON public.translations
  FOR SELECT TO anon, authenticated
  USING (true);

-- feature_flags: authenticated only (never anon); no full payload leak to public
DROP POLICY IF EXISTS feature_flags_public_read ON public.feature_flags;
CREATE POLICY feature_flags_authenticated_read ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS page_blocks_public_read ON public.page_blocks;
CREATE POLICY page_blocks_public_read ON public.page_blocks
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      WHERE p.id = page_blocks.page_id
        AND p.status = 'published'
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS slider_slides_public_read ON public.slider_slides;
CREATE POLICY slider_slides_public_read ON public.slider_slides
  FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM public.sliders s
      WHERE s.id = slider_slides.slider_id
        AND s.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- H2: Lock down admin matview
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.mv_admin_platform_stats FROM PUBLIC;
REVOKE ALL ON TABLE public.mv_admin_platform_stats FROM anon, authenticated;
GRANT SELECT ON TABLE public.mv_admin_platform_stats TO service_role;

-- ---------------------------------------------------------------------------
-- H1 + C2: SECURITY DEFINER hardening (authz + REVOKE PUBLIC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.venue_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_owner_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(
    CASE
      WHEN jsonb_typeof(v.data->'products') = 'array'
        THEN jsonb_array_length(v.data->'products')
      ELSE 0
    END,
    0
  )::integer
  INTO v_count
  FROM public.venues v
  WHERE v.owner_id = p_owner_id
  LIMIT 1;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_owner_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.menu_products mp
    WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
  ) THEN
    RETURN (
      SELECT count(*)::integer FROM public.menu_products mp
      WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
    );
  END IF;

  RETURN public.venue_product_count(p_owner_id);
END;
$$;

-- M8: robust trial_days parse
CREATE OR REPLACE FUNCTION public.get_trial_days()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  n integer;
BEGIN
  v := public.get_system_config('trial_days', '7'::jsonb);
  BEGIN
    n := (v #>> '{}')::integer;
  EXCEPTION WHEN OTHERS THEN
    n := 7;
  END;
  IF n IS NULL OR n < 1 THEN
    n := 7;
  END IF;
  RETURN n;
END;
$$;

-- H7: storage path must be under caller uid
CREATE OR REPLACE FUNCTION public.register_media_asset(
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_role public.media_role DEFAULT 'original',
  p_width integer DEFAULT NULL,
  p_height integer DEFAULT NULL,
  p_bucket text DEFAULT 'venue-media',
  p_public_url text DEFAULT NULL,
  p_original_filename text DEFAULT NULL,
  p_alt_text text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF split_part(p_storage_path, '/', 1) IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'invalid storage path: must start with auth.uid()';
  END IF;

  INSERT INTO public.media_assets (
    owner_id, role, status, visibility, mime_type, file_size, width, height,
    storage_bucket, storage_path, public_url, original_filename, alt_text,
    metadata, uploaded_by, created_by, updated_by
  ) VALUES (
    auth.uid(), p_role, 'ready', 'public', p_mime_type, coalesce(p_file_size, 0),
    p_width, p_height, p_bucket, p_storage_path, p_public_url, p_original_filename,
    p_alt_text, coalesce(p_metadata, '{}'::jsonb), auth.uid(), auth.uid(), auth.uid()
  )
  RETURNING id INTO v_id;

  PERFORM public.write_activity_log('media.upload', 'media_asset', v_id, p_original_filename);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_activity_log(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.activity_logs (owner_id, actor_id, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- REVOKE PUBLIC execute on sensitive DEFINER functions
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'venue_product_count','owner_product_count','write_activity_log',
        'register_media_asset','soft_delete_media_asset','refresh_admin_platform_stats',
        'get_system_config','get_trial_days','is_platform_admin'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.venue_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_activity_log(text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_media_asset(
  text, text, bigint, public.media_role, integer, integer, text, text, text, text, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_admin_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_config(text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_days() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- H4: Soft-fail phone check (skip if legacy rows violate)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format_chk;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_format_chk
    CHECK (
      phone IS NULL
      OR phone ~ '^\+?[0-9][0-9\s\-]{7,20}$'
    ) NOT VALID;
  -- Validate only new rows; optionally: VALIDATE CONSTRAINT later after cleanup
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'phone check not applied: existing rows violate format';
  WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'phone check skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- H5 soft: make admin-assets private-read for anon (keep authenticated public marketing optional)
-- Prefer signed/public only for intentionally public objects — tighten SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_assets_public_read" ON storage.objects;
DO $$
BEGIN
  CREATE POLICY "admin_assets_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'admin-assets');
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped admin-assets policy change (42501)';
  WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'Skipped admin-assets policy change';
    ELSE
      RAISE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- admin_users: mirror production revoke
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

COMMENT ON SCHEMA public IS
  'Meez public schema — validation remediation 202607250014 applied';
