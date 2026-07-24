-- =============================================================================
-- 202607250012 — Helper functions: config, activity, media register, soft delete
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_system_config(p_key text, p_default jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT value FROM public.system_config WHERE key = p_key AND (is_secret = false OR public.is_platform_admin())),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION public.get_trial_days()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((public.get_system_config('trial_days', '7'::jsonb))::text::integer, 7);
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
  INSERT INTO public.activity_logs (owner_id, actor_id, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.soft_delete_media_asset(p_media_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.media_assets
  SET deleted_at = now(), status = 'deleted', updated_by = auth.uid(), updated_at = now()
  WHERE id = p_media_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

-- JSON blob product count (for DBs that never applied admin customers migration)
CREATE OR REPLACE FUNCTION public.venue_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE
      WHEN jsonb_typeof(v.data->'products') = 'array'
        THEN jsonb_array_length(v.data->'products')
      ELSE 0
    END,
    0
  )::integer
  FROM public.venues v
  WHERE v.owner_id = p_owner_id
  LIMIT 1;
$$;

-- Prefer normalized menu_products; fall back to venues.data JSON
CREATE OR REPLACE FUNCTION public.owner_product_count(p_owner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.menu_products mp
      WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
    ) THEN (
      SELECT count(*)::integer FROM public.menu_products mp
      WHERE mp.owner_id = p_owner_id AND mp.deleted_at IS NULL
    )
    ELSE COALESCE(public.venue_product_count(p_owner_id), 0)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_config(text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_days() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.write_activity_log(text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_media_asset(
  text, text, bigint, public.media_role, integer, integer, text, text, text, text, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.venue_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_admin_platform_stats() TO authenticated;

COMMENT ON FUNCTION public.register_media_asset IS
  'Register Storage upload metadata after client upload; replaces Base64 persistence';
COMMENT ON FUNCTION public.get_trial_days IS
  'Single source of truth for trial length (system_config.trial_days)';
COMMENT ON FUNCTION public.venue_product_count IS
  'Count products inside venues.data JSONB (legacy blob)';
