-- Realtime للكشk: device_activations + venues

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'device_activations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_activations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'venues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
  END IF;
END $$;

-- الكشk (anon) يحتاج SELECT لاستقبال postgres_changes
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
        AND da.status = 'active'
    )
  );
