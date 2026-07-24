-- =============================================================================
-- 202607250003 — Supabase Storage buckets + policies (additive)
-- NOTE: storage.buckets is owned by supabase_storage_admin.
-- Dashboard SQL may lack ownership → bucket insert is best-effort.
-- If skipped: create buckets manually in Storage UI (names below).
-- =============================================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    (
      'venue-media',
      'venue-media',
      true,
      10485760,
      ARRAY[
        'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'
      ]::text[]
    ),
    (
      'venue-media-private',
      'venue-media-private',
      false,
      20971520,
      ARRAY[
        'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'
      ]::text[]
    ),
    (
      'admin-assets',
      'admin-assets',
      true,
      10485760,
      ARRAY[
        'image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'
      ]::text[]
    ),
    (
      'documents',
      'documents',
      false,
      52428800,
      ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg','image/png','text/plain'
      ]::text[]
    )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped storage.buckets insert (42501). Create buckets in Dashboard → Storage: venue-media, venue-media-private, admin-assets, documents';
  WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'Skipped storage.buckets insert (%). Create buckets in Dashboard → Storage.', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;

-- Path convention: {owner_id}/{yyyy}/{mm}/{uuid}.{ext}
-- Policies: best-effort (may also need storage admin on some projects)

DO $$
BEGIN
  -- venue-media
  DROP POLICY IF EXISTS "venue_media_public_read" ON storage.objects;
  CREATE POLICY "venue_media_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'venue-media');

  DROP POLICY IF EXISTS "venue_media_owner_insert" ON storage.objects;
  CREATE POLICY "venue_media_owner_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_owner_update" ON storage.objects;
  CREATE POLICY "venue_media_owner_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_owner_delete" ON storage.objects;
  CREATE POLICY "venue_media_owner_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'venue-media'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- venue-media-private
  DROP POLICY IF EXISTS "venue_media_private_owner_select" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_private_owner_insert" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_private_owner_update" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "venue_media_private_owner_delete" ON storage.objects;
  CREATE POLICY "venue_media_private_owner_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'venue-media-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- admin-assets
  DROP POLICY IF EXISTS "admin_assets_public_read" ON storage.objects;
  CREATE POLICY "admin_assets_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'admin-assets');

  DROP POLICY IF EXISTS "admin_assets_admin_write" ON storage.objects;
  CREATE POLICY "admin_assets_admin_write"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'admin-assets' AND public.is_platform_admin());

  DROP POLICY IF EXISTS "admin_assets_admin_update" ON storage.objects;
  CREATE POLICY "admin_assets_admin_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'admin-assets' AND public.is_platform_admin())
    WITH CHECK (bucket_id = 'admin-assets' AND public.is_platform_admin());

  DROP POLICY IF EXISTS "admin_assets_admin_delete" ON storage.objects;
  CREATE POLICY "admin_assets_admin_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'admin-assets' AND public.is_platform_admin());

  -- documents
  DROP POLICY IF EXISTS "documents_owner_select" ON storage.objects;
  CREATE POLICY "documents_owner_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "documents_owner_insert" ON storage.objects;
  CREATE POLICY "documents_owner_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "documents_owner_update" ON storage.objects;
  CREATE POLICY "documents_owner_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "documents_owner_delete" ON storage.objects;
  CREATE POLICY "documents_owner_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped storage.objects policies (42501). Add policies in Dashboard → Storage after creating buckets.';
  WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'Skipped storage.objects policies (%).', SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;
