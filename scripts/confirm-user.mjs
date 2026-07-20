/**
 * تأكيد بريد مستخدم في Supabase (تطوير فقط).
 * الاستخدام: node scripts/confirm-user.mjs owner@meez.app
 */
import pg from "pg";

const email = process.argv[2] || "owner@meez.app";
const url =
  process.env.DATABASE_URL ||
  "postgresql://postgres:ok%26%26n82SSB22@db.feorprugthydhyytvebe.supabase.co:5432/postgres";

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const res = await client.query(
    `UPDATE auth.users
     SET email_confirmed_at = NOW(),
         updated_at = NOW()
     WHERE email = $1
     RETURNING id, email, email_confirmed_at, confirmed_at`,
    [email],
  );
  if (!res.rowCount) {
    console.error("لم يُعثر على مستخدم:", email);
    process.exit(1);
  }
  console.log("تم التفعيل:", res.rows[0]);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await client.end();
}
