/**
 * Usage: DATABASE_URL="postgresql://..." node supabase/scripts/restore/check-db.mjs
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (Supabase Dashboard → Database → URI)");
  process.exit(1);
}

const c = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await c.connect();
  const r = await c.query(`
    select
      current_database() as db,
      current_user as usr,
      (select count(*)::int from information_schema.tables where table_schema = 'public') as public_tables,
      (select exists(
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'profiles'
      )) as has_profiles,
      (select count(*)::int from auth.users) as users,
      (select count(*)::int from public.venues) as venues,
      (select count(*)::int from public.profiles) as profiles
  `);
  console.log(JSON.stringify(r.rows[0], null, 2));
} catch (e) {
  console.error("CONNECT_FAIL", e.message);
  process.exitCode = 1;
} finally {
  await c.end().catch(() => {});
}
