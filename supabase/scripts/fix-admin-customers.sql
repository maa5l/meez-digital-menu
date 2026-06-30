-- Run in Supabase SQL Editor when /admin/customers fails.
-- (Same as migration 20260614160000_fix_admin_customers_rpc.sql)

-- Fix admin customer list/detail RPCs: avoid auth.users join, safe product counts
BEGIN;

-- Ensure profile columns referenced by admin RPCs exist (older DBs may lack phone)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

CREATE OR REPLACE FUNCTION public.venue_product_count(p_owner_id UUID)
RETURNS INT
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
  )::int
  FROM public.venues v
  WHERE v.owner_id = p_owner_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.venue_product_count(UUID) FROM PUBLIC;

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
    AND (
      p_status IS NULL OR p_status = '' OR
      COALESCE(s.status::text, 'expired') = p_status
    );

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
      NULL::timestamptz AS last_login,
      COALESCE(s.status::text, 'expired') AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      CASE
        WHEN s.owner_id IS NULL THEN 0
        ELSE public.subscription_device_limit(s)
      END AS device_limit,
      COALESCE(s.manual_activation, false) AS manual_activation,
      s.notes,
      p.internal_notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      public.venue_product_count(p.id) AS product_count
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    WHERE (v_search IS NULL OR
           p.email ILIKE '%' || v_search || '%' OR
           COALESCE(p.full_name, '') ILIKE '%' || v_search || '%' OR
           COALESCE(p.venue_name, '') ILIKE '%' || v_search || '%')
      AND (
        p_status IS NULL OR p_status = '' OR
        COALESCE(s.status::text, 'expired') = p_status
      )
    ORDER BY p.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('total', v_total, 'customers', v_rows, 'limit', v_limit, 'offset', v_offset);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_customer(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer JSONB;
  v_history JSONB;
BEGIN
  PERFORM public.admin_require_role('support');

  SELECT row_to_json(t)::jsonb INTO v_customer
  FROM (
    SELECT
      p.id AS owner_id,
      p.full_name,
      p.email,
      p.phone,
      p.venue_name,
      p.role,
      p.created_at AS registration_date,
      p.last_activity_at,
      p.internal_notes,
      NULL::timestamptz AS last_login,
      COALESCE(s.status::text, 'expired') AS subscription_status,
      s.trial_started_at,
      s.trial_ends_at,
      s.subscription_started_at,
      s.subscription_ends_at,
      CASE
        WHEN s.owner_id IS NULL THEN 0
        ELSE public.subscription_device_limit(s)
      END AS device_limit,
      COALESCE(s.manual_activation, false) AS manual_activation,
      s.activated_by,
      s.activated_at,
      s.notes,
      (SELECT COUNT(*)::int FROM public.device_activations da
       WHERE da.owner_id = p.id AND da.status = 'active') AS device_count,
      public.venue_product_count(p.id) AS product_count,
      public.resolve_subscription_access(p.id) AS access
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.owner_id = p.id
    WHERE p.id = p_owner_id
  ) t;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM public.subscription_history
    WHERE owner_id = p_owner_id
    ORDER BY created_at DESC
    LIMIT 50
  ) h;

  RETURN jsonb_build_object('ok', true, 'customer', v_customer, 'history', v_history);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, TEXT, INT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_customer(UUID) TO authenticated;

COMMIT;
