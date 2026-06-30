-- Final production hardening: protect internal_notes, fix admin stats, tighten grants
BEGIN;

-- Owners must not update internal_notes (admin-only field)
CREATE OR REPLACE FUNCTION public.profiles_block_internal_notes_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     AND COALESCE(public.get_admin_role()::text, '') NOT IN ('admin', 'super_admin')
  THEN
    NEW.internal_notes := OLD.internal_notes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_internal_notes ON public.profiles;
CREATE TRIGGER profiles_protect_internal_notes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_internal_notes_self_update();

-- Admin dashboard: recent activity from audit + admin logs (no broken columns)
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_require_role('support');

  RETURN jsonb_build_object(
    'total_customers', (SELECT COUNT(*)::int FROM public.profiles),
    'active_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'active'),
    'trial_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'trial'),
    'expired_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'expired'),
    'suspended_customers', (SELECT COUNT(*)::int FROM public.subscriptions WHERE status = 'suspended'),
    'total_devices', (SELECT COUNT(*)::int FROM public.device_activations WHERE status = 'active'),
    'new_registrations_7d', (
      SELECT COUNT(*)::int FROM public.profiles
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT action, metadata, created_at, owner_id
        FROM (
          SELECT al.action, al.metadata, al.created_at, al.owner_id
          FROM public.audit_logs al
          UNION ALL
          SELECT
            'admin.' || al.action,
            al.metadata,
            al.created_at,
            al.target_owner_id AS owner_id
          FROM public.admin_logs al
        ) combined
        ORDER BY created_at DESC
        LIMIT 30
      ) t
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;

-- Prevent authenticated direct INSERT into subscriptions (RPC-only creation)
REVOKE INSERT ON TABLE public.subscriptions FROM anon, authenticated;

-- Sanitize admin search input length in RPC
CREATE OR REPLACE FUNCTION public.admin_list_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
  v_total INT;
  v_search TEXT;
  v_limit INT;
  v_offset INT;
BEGIN
  PERFORM public.admin_require_role('support');

  v_search := NULLIF(BTRIM(LEFT(COALESCE(p_search, ''), 120)), '');
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT COUNT(*)::int INTO v_total
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.owner_id = p.id
  WHERE (v_search IS NULL OR
         p.email ILIKE '%' || v_search || '%' OR
         COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
         COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
    AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status);

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.created_at AS registration_date,
      p.last_activity_at,
      u.last_sign_in_at AS last_login,
      s.status::text AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      public.subscription_device_limit(s) AS device_limit,
      s.manual_activation,
      s.notes,
      p.internal_notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      (SELECT COALESCE(jsonb_array_length(v.data->'products'), 0)::int
       FROM public.venues v WHERE v.owner_id = p.id) AS product_count
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE (v_search IS NULL OR
           p.email ILIKE '%' || v_search || '%' OR
           COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
           COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
      AND (p_status IS NULL OR p_status = '' OR s.status::text = p_status)
    ORDER BY p.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('total', v_total, 'customers', v_rows, 'limit', v_limit, 'offset', v_offset);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) TO authenticated;

COMMIT;
