/**
 * Quick diagnostic: admin_list_customers RPC (requires signed-in admin session).
 * Usage: node scripts/test-admin-customers.mjs <email> <password>
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/test-admin-customers.mjs <email> <password>");
  process.exit(1);
}

const env = loadEnvLocal();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data: auth, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
if (signInErr) {
  console.error("sign_in_failed:", signInErr.message);
  process.exit(1);
}

console.log("signed_in:", auth.user?.email);

const { data: profile, error: profileErr } = await supabase.rpc("get_my_admin_profile");
console.log("get_my_admin_profile:", profileErr ? profileErr : profile);

const { data: customers, error: listErr } = await supabase.rpc("admin_list_customers", {
  p_search: null,
  p_status: null,
  p_limit: 5,
  p_offset: 0,
});
console.log("admin_list_customers:", listErr ? listErr : customers);

await supabase.auth.signOut();
