/**
 * حذف حساب Supabase بشكل كامل ونهائي (تطوير / صيانة).
 *
 * الاستخدام:
 *   DATABASE_URL="postgresql://..." node scripts/delete-user.mjs owner@meez.app
 *
 * ⚠️ لا رجعة فيه.
 */
import pg from "pg";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("الاستخدام: node scripts/delete-user.mjs <email>");
  process.exit(1);
}

const url =
  process.env.DATABASE_URL ||
  "postgresql://postgres:ok%26%26n82SSB22@db.feorprugthydhyytvebe.supabase.co:5432/postgres";

const rl = readline.createInterface({ input, output });
const confirm = await rl.question(
  `⚠️  حذف نهائي للحساب "${email}" — اكتب DELETE للتأكيد: `,
);
rl.close();

if (confirm.trim() !== "DELETE") {
  console.error("أُلغي. لم يُحذف شيء.");
  process.exit(1);
}

const sql = `
BEGIN;

DO $$
DECLARE
  v_email TEXT := $1;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'لم يُعثر على مستخدم: %', v_email;
  END IF;

  DELETE FROM public.audit_logs WHERE owner_id = v_user_id;
  DELETE FROM public.admin_logs
  WHERE target_owner_id = v_user_id OR admin_id = v_user_id;

  DELETE FROM auth.sessions WHERE user_id = v_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END $$;

COMMIT;
`;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql, [email]);
  const check = await client.query(
    "SELECT id FROM auth.users WHERE lower(trim(email)) = $1",
    [email],
  );
  if (check.rowCount) {
    console.error("فشل التحقق: الحساب ما زال موجوداً.");
    process.exit(1);
  }
  console.log("✓ تم حذف الحساب نهائياً:", email);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await client.end();
}
