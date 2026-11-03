-- Run in Supabase SQL Editor and paste the result here
-- Checks schema + data needed for the dashboard/kiosk RPCs

SELECT 'auth.users' AS check, count(*)::text AS value FROM auth.users
UNION ALL
SELECT 'public.profiles', count(*)::text FROM public.profiles
UNION ALL
SELECT 'public.venues', count(*)::text FROM public.venues
UNION ALL
SELECT 'public.subscriptions', count(*)::text FROM public.subscriptions
UNION ALL
SELECT 'public.device_activations', count(*)::text FROM public.device_activations
UNION ALL
SELECT 'fn get_owner_venue',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_owner_venue'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'fn get_venue_for_device',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_venue_for_device'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'fn get_kiosk_state',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_kiosk_state'
  ) THEN 'EXISTS' ELSE 'MISSING' END;

-- Per-user venue presence (must match auth.users ids)
SELECT u.id, u.email,
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id) AS has_profile,
  EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = u.id) AS has_venue,
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.owner_id = u.id) AS has_sub
FROM auth.users u
ORDER BY u.email;
