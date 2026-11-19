import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "server", "package.json"));
const pg = require("pg");

for (const file of [path.join(root, "server", ".env"), path.join(root, ".env.local")]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const fns = await client.query(`
  select proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and proname in (
      'enqueue_owner_notification',
      'enqueue_renewal_reminders',
      'enqueue_admin_alert',
      'enqueue_admin_digest',
      'render_notification_body'
    )
  order by 1
`);

const tpls = await client.query(`
  select template_key
  from notification_templates
  where channel = 'email' and locale = 'ar'
  order by 1
`);

const admins = await client.query(`
  select email, is_active, receive_instant, receive_digest
  from admin_alert_recipients
`);

console.log("functions=" + fns.rows.map((r) => r.proname).join(","));
console.log("templates=" + tpls.rows.map((r) => r.template_key).join(","));
console.log("admins=" + JSON.stringify(admins.rows));
await client.end();
