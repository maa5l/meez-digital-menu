-- تشخيص فقط — لا يحذف ولا يعدّل بيانات
-- يبيّن هل منتجات الحساب موجودة في السحابة (venues.data)

SELECT
  u.email,
  v.owner_id,
  v.updated_at,
  COALESCE(jsonb_array_length(v.data->'products'), 0) AS products_count,
  COALESCE(jsonb_array_length(v.data->'categories'), 0) AS categories_count,
  COALESCE(jsonb_array_length(v.data->'crops'), 0) AS crops_count,
  pg_size_pretty(pg_column_size(v.data)::bigint) AS data_size
FROM auth.users u
JOIN public.venues v ON v.owner_id = u.id
WHERE lower(u.email) LIKE '%s3oody%'
   OR lower(u.email) LIKE '%lenor%'
   OR lower(u.raw_user_meta_data->>'full_name') LIKE '%لينور%'
ORDER BY v.updated_at DESC NULLS LAST;
